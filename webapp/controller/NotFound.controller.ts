import BaseController from "./BaseController";
import { RouteName } from "../model/constants";

/**
 * Page of a request that does not exist, displayed by the detail in the second column
 * (target notFound, without a route of its own).
 *
 * @namespace sapui5.maintenance.controller
 */
export default class NotFound extends BaseController {

    /** Link to the list: the list route shows the list in one column. */
    public onNavToList(): void {
        this.getRouter().navTo(RouteName.List);
    }
}
