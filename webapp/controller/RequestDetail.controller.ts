import BaseController from "./BaseController";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import { NavigationActionsTargets } from "sap/f/FlexibleColumnLayoutSemanticHelper";
import { Button$PressEvent } from "sap/m/Button";
import ComboBox, { ComboBox$ChangeEvent } from "sap/m/ComboBox";
import { DraftIndicatorState } from "sap/m/library";
import { ListBase$DeleteEvent } from "sap/m/ListBase";
import MessageBox from "sap/m/MessageBox";
import MessagePopover from "sap/m/MessagePopover";
import MessageToast from "sap/m/MessageToast";
import Messaging from "sap/ui/core/Messaging";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import JSONModel from "sap/ui/model/json/JSONModel";
import { Model$PropertyChangeEvent } from "sap/ui/model/Model";
import Context from "sap/ui/model/odata/v4/Context";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import ODataModel, { ODataModel$PropertyChangeEventParameters } from "sap/ui/model/odata/v4/ODataModel";
import FileUploader, {
    FileUploader$ChangeEvent, FileUploader$TypeMissmatchEvent
} from "sap/ui/unified/FileUploader";
import {
    AttachmentLimit, AttachmentMediaType, AttachmentRejection, DetailRouteArguments, EntitySetPath, EquipmentProperty,
    HttpStatus, PartProperty, RequestProperty, RouteName, TargetName
} from "../model/constants";
import { createDetailViewModel } from "../model/models";

/**
 * Detail of a maintenance request, shown in the second column.
 *
 * The view is bound to the context that the model takes from the list binding by its path
 * (getKeepAliveContext; the list binding is marked with $$getKeepAliveContext). List and detail
 * share that context and its cache: the properties that the list has already read are not requested
 * again, and the model requests only the missing ones, for the shown request alone. The context is
 * kept alive, so that it stays valid when a filter of the list removes its row.
 *
 * A request of the URL that does not exist (malformed key, or 404 of the service) is shown with the
 * page of the target notFound, which replaces the detail in the second column.
 *
 * The mode of the screen is not kept in the controller: the view derives it from IsActiveEntity of the
 * bound request (display for the active request, edit for a draft). "Edit", "Save" and "Discard" call the
 * draft service and then navigate to the other version of the request, which the route binds like any other.
 *
 * In edit mode, each change of a field is sent to the draft by its two-way binding, without a button. The
 * controller follows those changes with the propertyChange event of the model: the footer shows the saving
 * state of the draft, and the messages of the service bound to the changed field are removed. The messages
 * of a failed activation stay in the message model (sap.ui.core.Messaging), bound to their fields; the view
 * gets that model as "message" for the message button and the message popover.
 *
 * The tables of operations and spare parts are editable in edit mode as well: their cells are input fields
 * bound two-way to the items of the draft, "Add" creates an item and the delete icon of a row deletes it.
 * Once the service has processed a change of an item (PATCH, POST or DELETE request), the controller asks
 * the draft service for its side effects: the estimated cost of the header after a change of a spare part.
 *
 * In edit mode a file can be attached to the draft: the file uploader of the attachments table only selects the
 * file. A file that the application does not accept (media type or size) is rejected with a message before anything
 * is sent; otherwise the attachment service creates the attachment and sends its content, while the busy indicator
 * blocks the screen. The comment of an attachment is an input field, sent to the draft like the other fields.
 *
 * @namespace sapui5.maintenance.controller
 */
export default class RequestDetail extends BaseController {

    /** Format of RequestUUID (Edm.Guid) in the URL. */
    private static readonly UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    /** Controls of the edit mode whose code list is read the first time a draft is shown. */
    private static readonly CODE_LIST_CONTROL_IDS = ["requestTypeSelect", "prioritySelect", "plantComboBox"];

    /** The kept-alive context of the shown request; undefined until a request is shown. */
    private requestContext?: Context;

    /** Key of the request of the last matched detail route, also while it is being read. */
    private routeKey?: Pick<DetailRouteArguments, "uuid" | "active">;

    /** Promise of the request of the last change of the shown draft, whose outcome the footer shows. */
    private lastChange?: Promise<unknown>;

    /** The message popover, loaded once from its fragment the first time it is opened. */
    private messagePopover?: Promise<MessagePopover>;

    public onInit(): void {
        this.setModel(Messaging.getMessageModel(), "message");
        this.setModel(createDetailViewModel(), "detailView");
        // the file dialog offers the accepted media types; the file uploader discards a file of another known type
        this.getAttachmentUploader().setMimeType(Object.values(AttachmentMediaType));
        this.getODataModel().attachPropertyChange(this.onPropertyChange, this);
        this.getRouter().getRoute(RouteName.Detail)?.attachPatternMatched(this.onPatternMatched, this);
    }

    public onExit(): void {
        this.getODataModel().detachPropertyChange(this.onPropertyChange, this);
        this.getRouter().getRoute(RouteName.Detail)?.detachPatternMatched(this.onPatternMatched, this);
    }

    /** Full screen: the detail route with the target layout that the semantic helper suggests. */
    public onEnterFullScreen(): void {
        this.navigateToLayout(this.getMidColumnActions().fullScreen);
    }

    /** Exit full screen: back to the two-column layout that the semantic helper suggests. */
    public onExitFullScreen(): void {
        this.navigateToLayout(this.getMidColumnActions().exitFullScreen);
    }

    /** Close: the target layout of the semantic helper is the list in one column, that is, the list route. */
    public onClose(): void {
        this.getRouter().navTo(RouteName.List);
    }

    /** Edit (active request): the request goes into edit mode on its draft. */
    public onEdit(): void {
        void this.editRequest();
    }

    /** Save (draft): the draft is activated. */
    public onSave(): void {
        void this.activateDraft();
    }

    /** Discard (draft): after confirmation, the draft is discarded. */
    public onDiscard(): void {
        void this.discardDraft();
    }

    /** Message button: opens or closes the popover with the detail of the messages; loaded the first time. */
    public onOpenMessages(event: Button$PressEvent): void {
        const button = event.getSource();
        void this.getMessagePopover().then((popover) => {
            // the messages may have changed since the popover last showed the detail of one of them
            popover.navigateBack();
            popover.toggle(button);
        });
    }

    /**
     * Change of the plant in edit mode: the equipment list shows the equipments of the new plant. The equipment
     * of the draft is not changed; if it does not belong to the plant, the activation reports it on the field.
     */
    public onPlantChange(event: ComboBox$ChangeEvent): void {
        this.filterEquipments(event.getSource().getSelectedKey());
    }

    /** Add (operations table, edit mode): creates an operation of the draft, shown at the top of the table. */
    public onAddTask(): void {
        const draftContext = this.requestContext;
        if (draftContext) {
            void this.addItem(draftContext, "taskTable");
        }
    }

    /**
     * Add (spare parts table, edit mode): creates a spare part of the draft, shown at the top of the table. Its
     * price gets the currency of the request: the service adds quantity by price of the spare parts to the
     * estimated cost of the request, which is in that currency.
     */
    public onAddPart(): void {
        void this.addPart();
    }

    /**
     * Add File (attachments table, edit mode): the file chosen in the file dialog is checked and attached to the draft.
     * Chrome fires the event without a file when the dialog is cancelled. The file uploader is cleared once the file
     * has been handled (asynchronously, after this event), so that the same file can be chosen again.
     */
    public onAttachmentFileChange(event: FileUploader$ChangeEvent): void {
        const fileUploader = event.getSource();
        const file = (event.getParameter("files") ?? [])[0] as File | undefined;
        if (file) {
            void this.addAttachment(file).finally(() => fileUploader.clear());
        }
    }

    /**
     * The file uploader has discarded a file whose media type is not one of the accepted ones. A file whose media
     * type the browser does not know passes the file uploader and is rejected by the check of the attachment service.
     */
    public onAttachmentTypeMismatch(event: FileUploader$TypeMissmatchEvent): void {
        void this.showAttachmentRejection(event.getParameter("fileName") ?? "", AttachmentRejection.Type);
    }

    /** Delete icon of a row of the operations or the spare parts table (edit mode): deletes the item. */
    public onDeleteItem(event: ListBase$DeleteEvent): void {
        const draftContext = this.requestContext;
        const itemContext = event.getParameter("listItem")?.getBindingContext() as Context | null | undefined;
        if (!draftContext || !itemContext) {
            return;
        }
        const itemPath = itemContext.getPath();
        void this.followChange(draftContext, this.getDraftService().deleteItem(itemContext), itemPath);
    }

    /**
     * Gets a draft of the current user for the shown active request (resumed or created by the action Edit)
     * and shows it. If the service rejects the action, the error handler shows its message and the request
     * stays in display mode.
     */
    private async editRequest(): Promise<void> {
        const activeContext = this.requestContext;
        if (!activeContext) {
            return;
        }
        try {
            await this.runBusy(() => this.getDraftService().edit(activeContext));
        } catch {
            // the model has reported the error of the service, and the error handler shows it
            return;
        }
        if (this.requestContext === activeContext) {
            this.navigateToRequest(false);
        }
    }

    /**
     * Activates the shown draft and shows the active request, with its number, and a notification. The busy
     * indicator blocks the screen meanwhile. If the service rejects the activation, the draft stays in edit
     * mode: the validation messages mark their fields and the message button in the footer shows their number
     * and their detail; any other error is shown by the error handler.
     */
    private async activateDraft(): Promise<void> {
        const draftContext = this.requestContext;
        if (!draftContext) {
            return;
        }
        let activeContext: Context;
        try {
            activeContext = await this.runBusy(() => this.getDraftService().activate(draftContext));
        } catch {
            // the model has reported the messages of the service: bound to their fields or shown by the error handler
            return;
        }
        if (this.requestContext !== draftContext) {
            return;
        }
        const requestID = await activeContext.requestProperty(RequestProperty.RequestID) as string;
        this.navigateToRequest(true);
        MessageToast.show(await this.getText("saveSuccessMessage", [requestID]));
    }

    /**
     * Discards the shown draft after confirmation and shows the active request again or, for a new request,
     * the list alone. If the service rejects the action, the error handler shows its message and the draft
     * stays in edit mode.
     */
    private async discardDraft(): Promise<void> {
        const draftContext = this.requestContext;
        if (!draftContext || !await this.confirmDiscard()) {
            return;
        }
        let hasActiveEntity: boolean;
        try {
            hasActiveEntity = await this.runBusy(() => this.getDraftService().discard(draftContext));
        } catch {
            // the model has reported the error of the service, and the error handler shows it
            return;
        }
        if (this.requestContext !== draftContext) {
            return;
        }
        if (hasActiveEntity) {
            this.navigateToRequest(true);
            return;
        }
        // the draft service has destroyed the context of the new request: the view no longer uses it.
        // ManagedObject#setBindingContext documents null, although its typings only declare Context.
        this.requestContext = undefined;
        this.resetDraftState();
        this.getView()?.setBindingContext(null as unknown as Context);
        this.getRouter().navTo(RouteName.List, {}, true);
    }

    /** Creates a spare part of the shown draft, with the currency of the request as currency of its price. */
    private async addPart(): Promise<void> {
        const draftContext = this.requestContext;
        if (!draftContext) {
            return;
        }
        let currencyCode: string;
        try {
            currencyCode = await draftContext.requestProperty(RequestProperty.CurrencyCode) as string;
        } catch {
            // the model has reported the error of the service, and the error handler shows it
            return;
        }
        await this.addItem(draftContext, "partTable", { [PartProperty.CurrencyCode]: currencyCode });
    }

    /**
     * Creates an item of a draft with the list binding of its table, which shows the new row at the top. The
     * screen is not blocked: the user can fill in the row while the service creates the item, and the model
     * sends those values with the POST request or after it.
     * @param draftContext The context of the draft
     * @param tableId Id of the table of the items: taskTable or partTable
     * @param initialData Initial values of the item
     */
    private async addItem(draftContext: Context, tableId: string, initialData?: Record<string, unknown>):
            Promise<void> {
        const binding = this.byId(tableId)?.getBinding("items") as ODataListBinding | undefined;
        const collectionPath = binding?.getResolvedPath();
        if (!binding || !collectionPath) {
            return;
        }
        await this.followChange(draftContext, this.getDraftService().create(binding, initialData), collectionPath);
    }

    /**
     * Attaches a file to the shown draft. A file that the application does not accept is rejected with a message,
     * before anything is sent. Otherwise the attachment service creates the attachment and sends its content: the
     * busy indicator blocks the screen until the table shows the new attachment, so that the draft is not saved or
     * discarded during the upload, and the footer shows the saving state of the draft. The model reports a failed
     * creation, and the attachment service a failed upload; the error handler shows them.
     * @param file The chosen file
     */
    private async addAttachment(file: File): Promise<void> {
        const draftContext = this.requestContext;
        const binding = this.byId("attachmentTable")?.getBinding("items") as ODataListBinding | undefined;
        const collectionPath = binding?.getResolvedPath();
        if (!draftContext || !binding || !collectionPath) {
            return;
        }
        const attachmentService = this.getAttachmentService();
        const rejection = attachmentService.checkFile(file);
        if (rejection) {
            await this.showAttachmentRejection(file.name, rejection);
            return;
        }
        await this.runBusy(() => this.followChange(draftContext, attachmentService.add(binding, file), collectionPath));
    }

    /**
     * Tells the user why a file cannot be attached: its media type is not accepted, or it is too large.
     * @param fileName Name of the rejected file
     * @param rejection Reason of the rejection
     */
    private async showAttachmentRejection(fileName: string, rejection: AttachmentRejection): Promise<void> {
        const text = rejection === AttachmentRejection.Size
            ? await this.getText("attachmentRejectedSize", [fileName, AttachmentLimit.MaxFileSizeMB])
            : await this.getText("attachmentRejectedType", [fileName]);
        MessageBox.error(text, { styleClass: this.getComponent().getContentDensityClass() });
    }

    /** Asks the user to confirm that the draft and its changes are discarded. */
    private async confirmDiscard(): Promise<boolean> {
        const [title, text, discardAction] = await Promise.all([
            this.getText("discardConfirmTitle"),
            this.getText("discardConfirmText"),
            this.getText("discardConfirmAction")
        ]);
        return new Promise((resolve) => {
            MessageBox.confirm(text, {
                title,
                actions: [discardAction, MessageBox.Action.CANCEL],
                emphasizedAction: discardAction,
                styleClass: this.getComponent().getContentDensityClass(),
                onClose: (action: string | null) => resolve(action === discardAction)
            });
        });
    }

    /**
     * Shows the other version of the current request, the active request or its draft (same RequestUUID),
     * with the current column layout. The history entry is replaced: the version shown before no longer
     * exists or is no longer the one to be edited.
     * @param isActive Whether the active request or the draft is shown
     */
    private navigateToRequest(isActive: boolean): void {
        if (!this.routeKey) {
            return;
        }
        const routeArguments: DetailRouteArguments = {
            uuid: this.routeKey.uuid,
            active: String(isActive),
            layout: this.getAppViewModel().getProperty("/layout") as string
        };
        this.getRouter().navTo(RouteName.Detail, routeArguments, true);
    }

    /**
     * Binds the view to the request whose key is in the arguments of the detail route. A key that is not
     * a request key (a URL written by hand) shows the not-found page without asking the service.
     */
    private readonly onPatternMatched = (event: Route$PatternMatchedEvent): void => {
        const routeArguments = event.getParameter("arguments") as DetailRouteArguments;
        this.routeKey = { uuid: routeArguments.uuid, active: routeArguments.active };
        if (!this.isRequestKey(routeArguments)) {
            void this.showNotFound();
            return;
        }
        void this.bindRequest(routeArguments.uuid, routeArguments.active === "true");
    };

    /**
     * Binds the view to the kept-alive context of the request with the given key. The key predicate
     * is calculated from the metadata, which may still be loading when the URL is opened directly.
     *
     * The view is bound once the request is known to exist (requestExists); otherwise the not-found page
     * is shown and the context is released. Another error of the service (no connection, 500) releases
     * the context as well: the model reports it, and the error handler shows it in its message box. If
     * another request has been navigated to in the meantime, the result is discarded. The context of the
     * request shown before is released afterwards: the list binding manages it again and destroys it when
     * its row is no longer in the list. Its transition messages (a failed activation) are removed, so that the
     * message button does not show them with another request, and the saving state starts empty.
     * @param uuid RequestUUID of the request
     * @param isActive IsActiveEntity of the request: the active entity or the draft
     */
    private async bindRequest(uuid: string, isActive: boolean): Promise<void> {
        const model = this.getModel<ODataModel>();
        const keyPredicate = await model.requestKeyPredicate(EntitySetPath.Requests, {
            [RequestProperty.RequestUUID]: uuid,
            [RequestProperty.IsActiveEntity]: isActive
        });
        if (!keyPredicate) {
            return;
        }
        const path = EntitySetPath.Requests + keyPredicate;
        if (this.requestContext?.getPath() === path) {
            return;
        }
        const context = model.getKeepAliveContext(path);
        let exists: boolean;
        try {
            exists = await this.requestExists(context);
        } catch {
            this.releaseContext(context);
            return;
        }
        if (!this.isRouteKey(uuid, isActive)) {
            this.releaseContext(context);
            return;
        }
        if (!exists) {
            this.releaseContext(context);
            await this.showNotFound();
            return;
        }
        const previousContext = this.requestContext;
        this.getView()?.setBindingContext(context);
        this.requestContext = context;
        this.resetDraftState();
        if (previousContext && previousContext !== context) {
            this.getDraftService().removeTransitionMessages(previousContext.getPath(), true);
            if (previousContext.isKeepAlive()) {
                previousContext.setKeepAlive(false);
            }
        }
        if (!isActive) {
            void this.prepareEditMode(context);
        }
    }

    /**
     * Prepares the input fields of the edit mode for the shown draft. The code lists are suspended in the view,
     * so that the display mode does not read them: they are read the first time a draft is shown. The equipment
     * list gets the equipments of the plant of the draft.
     * @param context The context of the draft
     */
    private async prepareEditMode(context: Context): Promise<void> {
        for (const id of RequestDetail.CODE_LIST_CONTROL_IDS) {
            const binding = this.byId(id)?.getBinding("items") as ODataListBinding | undefined;
            if (binding?.isSuspended()) {
                binding.resume();
            }
        }
        let plant: string;
        try {
            plant = await context.requestProperty(RequestProperty.Plant) as string;
        } catch {
            // the model has reported the error of the service, and the error handler shows it
            return;
        }
        if (this.requestContext === context) {
            this.filterEquipments(plant);
        }
    }

    /**
     * Shows in the equipment list the equipments of the given plant. Without a plant the list is empty, and
     * no request is sent (Filter.NONE). The list binding is suspended until the first draft is shown: the
     * filter is set before the binding reads its data.
     * @param plant Code of the plant; empty while the draft has no plant
     */
    private filterEquipments(plant: string): void {
        const binding = this.getEquipmentComboBox().getBinding("items") as ODataListBinding | undefined;
        if (!binding) {
            return;
        }
        binding.filter(plant ? new Filter(EquipmentProperty.Plant, FilterOperator.EQ, plant) : Filter.NONE);
        if (binding.isSuspended()) {
            binding.resume();
        }
    }

    /**
     * A property has been changed by a two-way binding. For a property of the shown draft (a field of the
     * request, or of one of its items), the transition messages bound to that property are removed, because
     * they refer to the value that the service validated, and the change is followed until it is saved.
     */
    private readonly onPropertyChange = (event: Model$PropertyChangeEvent): void => {
        const { resolvedPath, promise } = event.getParameters() as ODataModel$PropertyChangeEventParameters;
        const draftContext = this.requestContext;
        if (!draftContext || !resolvedPath?.startsWith(`${draftContext.getPath()}/`)) {
            return;
        }
        this.getDraftService().removeTransitionMessages(resolvedPath, false);
        if (promise) {
            void this.followChange(draftContext, promise, resolvedPath);
        }
    };

    /**
     * Follows a change of a draft (the PATCH request of a field, the POST or DELETE request of an item, or the
     * creation and upload of an attachment) until the service has processed it: the footer shows its saving state
     * and, once the change is saved, the draft service loads its side effects, such as the estimated cost after a
     * change of a spare part. The request of the side effects is sent after the change, so that the service has
     * already recalculated the data.
     * @param draftContext The context of the draft
     * @param change Promise on the outcome of the request of the change
     * @param changedPath Absolute path of the changed property, of the deleted item or of the collection of the
     *   created item
     */
    private async followChange(draftContext: Context, change: Promise<unknown>, changedPath: string):
            Promise<void> {
        if (!await this.showDraftState(change)) {
            return;
        }
        try {
            await this.getDraftService().requestSideEffects(draftContext, changedPath);
        } catch {
            // the model has reported the error of the service, and the error handler shows it; a draft activated
            // or discarded in the meantime has no data left to load
        }
    }

    /**
     * Shows the saving state of a change: "Saving draft..." while its request is pending, and "Draft saved"
     * once the service has processed it. A failed PATCH request is repeated by the model with the next change,
     * so the state stays "Saving draft..." until then; its promise is rejected only when the change is reset.
     * A failed POST or DELETE request of an item rejects its promise, and the state is cleared. Only the
     * outcome of the last change is shown, so that the state does not show "Draft saved" while a later change
     * is still pending.
     * @param change Promise on the outcome of the request of the change
     * @returns Whether the service has saved the change
     */
    private async showDraftState(change: Promise<unknown>): Promise<boolean> {
        this.lastChange = change;
        this.setDraftState(DraftIndicatorState.Saving);
        let saved = true;
        try {
            await change;
        } catch {
            saved = false;
        }
        if (this.lastChange === change) {
            this.setDraftState(saved ? DraftIndicatorState.Saved : DraftIndicatorState.Clear);
        }
        return saved;
    }

    /** No saving state: no change has been made since the request was shown. */
    private resetDraftState(): void {
        this.lastChange = undefined;
        this.setDraftState(DraftIndicatorState.Clear);
    }

    private setDraftState(state: DraftIndicatorState): void {
        this.getModel<JSONModel>("detailView").setProperty("/draftState", state);
    }

    /** The message popover, loaded once from the fragment MessagePopover as a dependent of the view. */
    private getMessagePopover(): Promise<MessagePopover> {
        this.messagePopover ??= this.loadFragment({
            name: "sapui5.maintenance.view.MessagePopover"
        }) as Promise<MessagePopover>;
        return this.messagePopover;
    }

    /**
     * Whether the request of the context exists, read through its key. The context of a row of the list
     * already has the key: no request is sent. Otherwise the model reads the entity by its key path
     * (getKeepAliveContext has sent that request), and the service answers 404 when it does not exist.
     * The model reports that error as a technical message, which the error handler removes without a
     * message box (controller/ErrorHandler.ts).
     * @param context The kept-alive context of the request
     * @returns false for a 404 response; any other error rejects the promise
     */
    private async requestExists(context: Context): Promise<boolean> {
        try {
            await context.requestProperty(RequestProperty.RequestUUID);
            return true;
        } catch (error) {
            if (error instanceof Error && (error as Error & { status?: number }).status === HttpStatus.NotFound) {
                return false;
            }
            throw error;
        }
    }

    /**
     * Gives the lifecycle of a context back to the list binding, unless it is the context of the view.
     * @param context A context obtained with getKeepAliveContext
     */
    private releaseContext(context: Context): void {
        if (context !== this.requestContext && context.isKeepAlive()) {
            context.setKeepAlive(false);
        }
    }

    /** Displays the not-found page in the second column; the URL stays the one of the detail route. */
    private async showNotFound(): Promise<void> {
        await this.getRouter().getTargets()?.display(TargetName.NotFound);
    }

    /**
     * Whether the arguments contain a request key: RequestUUID in the format of Edm.Guid and
     * IsActiveEntity as "true" or "false".
     */
    private isRequestKey(routeArguments: DetailRouteArguments): boolean {
        return RequestDetail.UUID_PATTERN.test(routeArguments.uuid)
            && (routeArguments.active === "true" || routeArguments.active === "false");
    }

    /** Whether the given key is still the one of the last matched detail route. */
    private isRouteKey(uuid: string, isActive: boolean): boolean {
        return this.routeKey?.uuid === uuid && this.routeKey.active === String(isActive);
    }

    /**
     * Navigates to the detail route of the current request with another layout.
     * @param layout Target layout of a navigation action; nothing happens without one
     */
    private navigateToLayout(layout: string | null | undefined): void {
        if (!layout || !this.routeKey) {
            return;
        }
        const routeArguments: DetailRouteArguments = { ...this.routeKey, layout };
        this.getRouter().navTo(RouteName.Detail, routeArguments);
    }

    /** Navigation actions of the detail column, written by the App controller into the appView model. */
    private getMidColumnActions(): NavigationActionsTargets {
        return this.getAppViewModel().getProperty("/actionButtonsInfo/midColumn") as NavigationActionsTargets;
    }

    /**
     * The OData V4 model of the component. In onInit the view is not yet in the control tree of the
     * component and does not have the model yet.
     */
    private getODataModel(): ODataModel {
        return this.getComponent().getModel() as ODataModel;
    }

    private getEquipmentComboBox(): ComboBox {
        return this.byId("equipmentComboBox") as ComboBox;
    }

    private getAttachmentUploader(): FileUploader {
        return this.byId("attachmentUploader") as FileUploader;
    }
}
