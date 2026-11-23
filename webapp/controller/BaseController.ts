import Controller from "sap/ui/core/mvc/Controller";
import Router from "sap/f/routing/Router";
import Model from "sap/ui/model/Model";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import type Component from "../Component";
import type DraftService from "../service/DraftService";

/**
 * Base class of all controllers: typed access to the component, the router, the models,
 * the texts, the appView model and the draft service.
 *
 * @namespace sapui5.maintenance.controller
 */
export default abstract class BaseController extends Controller {

    /** The owner component of the view. */
    public getComponent(): Component {
        return this.getOwnerComponent() as Component;
    }

    /** The router of the component (sap.f.routing.Router, see manifest.json). */
    public getRouter(): Router {
        return this.getComponent().getRouter() as Router;
    }

    /**
     * A model of the view or, when the view has none with that name, of the component.
     * @param name Model name; omitted for the default OData V4 model
     */
    public getModel<T extends Model = Model>(name?: string): T {
        return this.getView()?.getModel(name) as T;
    }

    /**
     * Sets a model on the view.
     * @param model The model
     * @param name Model name; omitted for the default model
     */
    public setModel(model: Model, name?: string): this {
        this.getView()?.setModel(model, name);
        return this;
    }

    /** The appView model of the component (layout, busy and editable). */
    public getAppViewModel(): JSONModel {
        return this.getComponent().getModel("appView") as JSONModel;
    }

    /** The draft service of the component: creation, edit and discard of requests. */
    public getDraftService(): DraftService {
        return this.getComponent().getDraftService();
    }

    /**
     * Runs a task with the busy indicator of the application (appView>/busy) switched on.
     * @param task The task, for example a call of the draft service
     * @returns The result of the task
     */
    public async runBusy<T>(task: () => Promise<T>): Promise<T> {
        const appViewModel = this.getAppViewModel();
        appViewModel.setProperty("/busy", true);
        try {
            return await task();
        } finally {
            appViewModel.setProperty("/busy", false);
        }
    }

    /** The resource bundle of the i18n model. */
    public getResourceBundle(): Promise<ResourceBundle> {
        const resourceModel = this.getComponent().getModel("i18n") as ResourceModel;
        return Promise.resolve(resourceModel.getResourceBundle());
    }

    /**
     * A text of the i18n model.
     * @param key Key of the text
     * @param args Values for the placeholders of the text
     */
    public async getText(key: string, args?: (string | number)[]): Promise<string> {
        const bundle = await this.getResourceBundle();
        return bundle.getText(key, args) ?? key;
    }
}
