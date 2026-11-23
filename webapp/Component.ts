import UIComponent from "sap/ui/core/UIComponent";
import Device from "sap/ui/Device";
import { createAppViewModel, createDeviceModel } from "./model/models";
import ErrorHandler from "./controller/ErrorHandler";

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
    private contentDensityClass: string;

    public init(): void {
        // call the base component's init function; creates the models of the manifest and the router
        super.init();

        // single message box for technical errors of the service
        this.errorHandler = new ErrorHandler(this);

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
