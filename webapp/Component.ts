import UIComponent from "sap/ui/core/UIComponent";
import Device from "sap/ui/Device";
import View from "sap/ui/core/mvc/View";
import FlexibleColumnLayout from "sap/f/FlexibleColumnLayout";
import FlexibleColumnLayoutSemanticHelper from "sap/f/FlexibleColumnLayoutSemanticHelper";
import { LayoutType } from "sap/f/library";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { createAppViewModel, createDeviceModel } from "./model/models";
import ErrorHandler from "./controller/ErrorHandler";
import DraftService from "./service/DraftService";
import AttachmentService from "./service/AttachmentService";
import ActionService from "./service/ActionService";
import ValueHelpService from "./service/ValueHelpService";

/**
 * @namespace sapui5.maintenance
 */
export default class Component extends UIComponent {

    public static metadata = {
        manifest: "json",
        interfaces: [
            "sap.ui.core.IAsyncContentCreation"
        ]
    };

    private errorHandler: ErrorHandler;
    private draftService: DraftService;
    private attachmentService: AttachmentService;
    private actionService: ActionService;
    private valueHelpService: ValueHelpService;
    private contentDensityClass: string;

    public init(): void {
        // call the base component's init function; creates the models of the manifest and the router
        super.init();

        // single message box for technical errors of the service
        this.errorHandler = new ErrorHandler(this);

        // draft actions of the service, shared by the list and the detail
        this.draftService = new DraftService(this.getModel() as ODataModel);

        // binary content of the attachments; the draft service creates the attachment entities
        this.attachmentService = new AttachmentService(this.getModel() as ODataModel, this.draftService);

        // business actions and deletion of the requests
        this.actionService = new ActionService(this.getModel() as ODataModel);

        // search of the codes typed in the fields with a search help
        this.valueHelpService = new ValueHelpService(this.getModel() as ODataModel);

        // set the device and the appView models
        this.setModel(createDeviceModel(), "device");
        this.setModel(createAppViewModel(), "appView");

        // enable routing
        this.getRouter().initialize();
    }

    public destroy(suppressInvalidate?: boolean): void {
        this.errorHandler.destroy();
        super.destroy(suppressInvalidate);
    }

    /**
     * The semantic helper of the FlexibleColumnLayout of the root view, which suggests the layout of each
     * view level and the navigation actions of the detail column. The application has two levels, list
     * and detail: at most two columns, with the detail expanded by default. The helper keeps one instance
     * per layout; the settings apply to the first call. Available once the root view has been created.
     */
    public getHelper(): FlexibleColumnLayoutSemanticHelper {
        const flexibleColumnLayout = (this.getRootControl() as View).byId("fcl") as FlexibleColumnLayout;
        return FlexibleColumnLayoutSemanticHelper.getInstanceFor(flexibleColumnLayout, {
            defaultTwoColumnLayoutType: LayoutType.TwoColumnsMidExpanded,
            maxColumnsCount: 2
        });
    }

    /** The draft handling of the requests: creation, edit and discard (service/DraftService.ts). */
    public getDraftService(): DraftService {
        return this.draftService;
    }

    /** The attachments of the requests: check, upload and binary content (service/AttachmentService.ts). */
    public getAttachmentService(): AttachmentService {
        return this.attachmentService;
    }

    /** The search of the codes of plants, equipments and materials (service/ValueHelpService.ts). */
    public getValueHelpService(): ValueHelpService {
        return this.valueHelpService;
    }

    /** The error handler: the controllers that show an error themselves run its capture. */
    public getErrorHandler(): ErrorHandler {
        return this.errorHandler;
    }

    /** The business actions of the requests and their deletion (service/ActionService.ts). */
    public getActionService(): ActionService {
        return this.actionService;
    }

    /**
     * The content density class of the application: compact on devices without touch support,
     * cozy otherwise. Views and dialogs opened outside the views apply it.
     */
    public getContentDensityClass(): string {
        if (this.contentDensityClass === undefined) {
            this.contentDensityClass = Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
        }
        return this.contentDensityClass;
    }
}
