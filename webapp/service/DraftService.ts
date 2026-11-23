import Messaging from "sap/ui/core/Messaging";
import Context from "sap/ui/model/odata/v4/Context";
import ODataContextBinding from "sap/ui/model/odata/v4/ODataContextBinding";
import ODataListBinding, { ODataListBinding$CreateCompletedEvent } from "sap/ui/model/odata/v4/ODataListBinding";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { EntitySetPath, HttpStatus, RequestProperty } from "../model/constants";
import type { Request } from "../model/types";

/** Properties of the annotation Common.DraftRoot that hold the qualified name of a draft action. */
type DraftRootAction = "EditAction" | "ActivationAction" | "DiscardAction";

/** Binding parameters of a deferred operation binding. */
type OperationParameters = Parameters<ODataModel["bindContext"]>[2];

/**
 * Draft handling of the maintenance requests (docs/servicio.md, section 4): creation of a draft and the
 * bound actions Edit, Activate and Discard. The controllers call these methods and never build an action name.
 *
 * The qualified names of the actions are read from the annotation Common.DraftRoot of the entity set
 * Requests, which contains them with the namespace of the service. Each action is invoked with a
 * deferred operation binding relative to the context of the request (ODataContextBinding#invoke).
 *
 * The list and the detail share the contexts of the list binding (getKeepAliveContext). Each method
 * keeps that list binding in line with the service, so that the list shows the result without reading
 * the list again.
 *
 * The model reports the messages of an error response as transition messages and keeps them until the
 * application removes them: the validation messages of a failed activation stay bound to the fields of the
 * draft. They are removed when the draft is activated again or discarded (removeTransitionMessages).
 */
export default class DraftService {

    /** Annotation of the entity set Requests that names the draft actions. */
    private static readonly DRAFT_ROOT = "@com.sap.vocabularies.Common.v1.DraftRoot";

    /** Mandatory parameter of the action Edit. */
    private static readonly PRESERVE_CHANGES = "PreserveChanges";

    /** Navigation from an active request to the draft of the current user. */
    private static readonly SIBLING_ENTITY = "SiblingEntity";

    private readonly model: ODataModel;

    /**
     * @param model The OData V4 model of the service
     */
    constructor(model: ODataModel) {
        this.model = model;
    }

    /**
     * Creates a request with the list binding: the service creates it directly as a draft
     * (IsActiveEntity false), and the list shows it at the top.
     *
     * If the POST fails, the model reports the error and would repeat the POST with the next change of
     * the entity. The transient context is deleted instead, so that no empty row stays in the list.
     * @param listBinding The list binding of the requests
     * @returns The context of the new draft, once the service has created it and its key is known
     */
    public async create(listBinding: ODataListBinding): Promise<Context> {
        const context = listBinding.create();
        const success = await new Promise<boolean>((resolve) => {
            const onCreateCompleted = (event: ODataListBinding$CreateCompletedEvent): void => {
                if (event.getParameter("context") === context) {
                    listBinding.detachCreateCompleted(onCreateCompleted);
                    resolve(event.getParameter("success") === true);
                }
            };
            listBinding.attachCreateCompleted(onCreateCompleted);
        });
        if (!success) {
            // the deletion cancels the creation: its promise is rejected on purpose
            void context.created()?.catch(() => undefined);
            await context.delete();
            throw new Error(`The service did not create the draft in ${listBinding.getPath()}`);
        }
        await context.created();
        return context;
    }

    /**
     * Puts an active request into edit mode: afterwards the request has a draft of the current user,
     * which has the same RequestUUID and IsActiveEntity false.
     *
     * A draft of the current user is resumed. Otherwise the action Edit creates the draft, with
     * PreserveChanges true so that the draft of another user is never overwritten: while another user
     * edits the request, the service rejects the action and the model reports its message. The draft
     * returned by the action replaces the active request in the list binding (bReplaceWithRVC), at the
     * same position, and is requested with the $select and $expand of that binding.
     * @param activeContext The context of the active request, from the list binding of the requests
     */
    public async edit(activeContext: Context): Promise<void> {
        if (await this.hasOwnDraft(activeContext)) {
            return;
        }
        const operation = await this.bindAction("EditAction", activeContext, { $$inheritExpandSelect: true });
        operation.setParameter(DraftService.PRESERVE_CHANGES, true);
        try {
            await operation.invoke(undefined, false, undefined, true);
        } finally {
            operation.destroy();
        }
    }

    /**
     * Activates a draft with the action Activate: the service validates the draft and, without errors,
     * answers 201 with the active request, whose number (RequestID) is assigned at the first activation.
     *
     * The action is sent in the group of the binding ($auto), queued behind the PATCH requests of the
     * changes made so far, so that the service validates the last values. The transition messages of the
     * previous activation are removed first. If a validation fails, the service answers 400 with each message
     * bound to its field (target $Parameter/_it/Equipment, for example): the model binds the messages to the
     * properties of the draft context, the promise is rejected and the draft stays as it is.
     *
     * The active request returned by the action replaces the draft in the list binding (bReplaceWithRVC), at
     * the same position, and is requested with the $select and $expand of that binding.
     * @param draftContext The context of the draft, from the list binding of the requests
     * @returns The context of the active request, which has taken the place of the draft in the list binding
     */
    public async activate(draftContext: Context): Promise<Context> {
        this.removeTransitionMessages(draftContext.getPath(), true);
        const operation = await this.bindAction("ActivationAction", draftContext, { $$inheritExpandSelect: true });
        try {
            const activeContext = await operation.invoke(undefined, false, undefined, true);
            if (!activeContext) {
                throw new Error(`The action Activate returned no request for ${draftContext.getPath()}`);
            }
            return activeContext;
        } finally {
            operation.destroy();
        }
    }

    /**
     * Discards a draft with the action Discard (the service rejects DELETE on a draft root) and removes it
     * from the list binding:
     * - Draft of an active request: the active request is read and takes the place of the draft in the
     *   list (replaceWith). The draft context stays kept alive outside the list until the caller releases it.
     * - Draft of a new request: the draft is refreshed with removal allowed. As it no longer exists in the
     *   service, the list removes it and the model destroys its context.
     * The transition messages of the draft are removed with it.
     * @param draftContext The context of the draft, from the list binding of the requests
     * @returns Whether the request has an active version, which the caller shows instead of the draft
     */
    public async discard(draftContext: Context): Promise<boolean> {
        const hasActiveEntity = await draftContext.requestProperty(RequestProperty.HasActiveEntity) as boolean;
        const operation = await this.bindAction("DiscardAction", draftContext);
        try {
            await operation.invoke();
        } finally {
            operation.destroy();
        }
        this.removeTransitionMessages(draftContext.getPath(), true);
        if (!hasActiveEntity) {
            await draftContext.requestRefresh(undefined, true);
            return false;
        }
        const keyPredicate = await this.model.requestKeyPredicate(EntitySetPath.Requests, {
            [RequestProperty.RequestUUID]: draftContext.getProperty(RequestProperty.RequestUUID) as string,
            [RequestProperty.IsActiveEntity]: true
        });
        const activeContext = this.model.getKeepAliveContext(EntitySetPath.Requests + keyPredicate);
        await activeContext.requestProperty(RequestProperty.RequestUUID);
        // an active request already in the list (data read before the draft existed) keeps its row
        if (activeContext.getIndex() === undefined) {
            draftContext.replaceWith(activeContext);
        }
        return true;
    }

    /**
     * Removes the transition messages of a request, or of one of its properties: the messages of the
     * responses to the draft actions, such as the validation messages of a failed activation, which the model
     * keeps until the application removes them. The state messages of the entities (SAP__Messages) are not
     * transition messages: the model replaces them with each response.
     * @param path Absolute path of the request, or of one of its properties
     * @param includeChildren Whether the messages of the properties and of the items of the request are removed
     *   as well, or only the messages whose target is the path itself
     */
    public removeTransitionMessages(path: string, includeChildren: boolean): void {
        const messages = this.model.getMessagesByPath(path, includeChildren)
            .filter((message) => message.getPersistent());
        if (messages.length > 0) {
            Messaging.removeMessages(messages);
        }
    }

    /**
     * Whether the active request has a draft of the current user. HasDraftEntity tells whether the request
     * has a draft of any user; SiblingEntity of an active request is the draft of the current user, the
     * navigation that the filter of the list relies on. The service answers 404 or no content when there
     * is no such draft; the error handler removes the message of a 404 response.
     * @param activeContext The context of the active request
     */
    private async hasOwnDraft(activeContext: Context): Promise<boolean> {
        if (await activeContext.requestProperty(RequestProperty.HasDraftEntity) !== true) {
            return false;
        }
        const siblingBinding = this.model.bindContext(DraftService.SIBLING_ENTITY, activeContext, {
            $select: [RequestProperty.RequestUUID, RequestProperty.IsActiveEntity]
        });
        try {
            const sibling = await siblingBinding.requestObject() as Partial<Request> | null | undefined;
            return sibling?.IsActiveEntity === false;
        } catch (error) {
            if (error instanceof Error && (error as Error & { status?: number }).status === HttpStatus.NotFound) {
                return false;
            }
            throw error;
        } finally {
            siblingBinding.destroy();
        }
    }

    /**
     * A deferred operation binding for a draft action, relative to the context of a request.
     * @param action Property of the annotation Common.DraftRoot that names the action
     * @param context Context of the request: the binding parameter of the action
     * @param parameters Binding parameters of the operation binding
     */
    private async bindAction(action: DraftRootAction, context: Context,
            parameters?: OperationParameters): Promise<ODataContextBinding> {
        const actionName = await this.requestActionName(action);
        return this.model.bindContext(`${actionName}(...)`, context, parameters);
    }

    /**
     * The qualified name of a draft action, read from the annotation Common.DraftRoot of the entity set
     * Requests, for example com.sap.gateway.srvd.zui_mnt_request.v0001.Edit.
     * @param action Property of the annotation that names the action
     */
    private async requestActionName(action: DraftRootAction): Promise<string> {
        const actionName: unknown = await this.model.getMetaModel()
            .requestObject(`${EntitySetPath.Requests}${DraftService.DRAFT_ROOT}/${action}`);
        if (typeof actionName !== "string") {
            throw new Error(`${action} is missing in the annotation Common.DraftRoot of ${EntitySetPath.Requests}`);
        }
        return actionName;
    }
}
