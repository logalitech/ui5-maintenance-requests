import BaseController from "./BaseController";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import Context from "sap/ui/model/odata/v4/Context";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { DetailRouteArguments, EntitySetPath, RequestProperty, RouteName } from "../model/constants";

/**
 * Detail of a maintenance request, shown in the second column.
 *
 * The view is bound to the context that the model takes from the list binding by its path
 * (getKeepAliveContext; the list binding is marked with $$getKeepAliveContext). List and detail
 * share that context and its cache: the properties that the list has already read are not requested
 * again, and the model requests only the missing ones, for the shown request alone. The context is
 * kept alive, so that it stays valid when a filter of the list removes its row.
 *
 * @namespace sapui5.maintenance.controller
 */
export default class RequestDetail extends BaseController {

    /** The kept-alive context of the shown request; undefined until a request is shown. */
    private requestContext?: Context;

    public onInit(): void {
        this.getRouter().getRoute(RouteName.Detail)?.attachPatternMatched(this.onPatternMatched, this);
    }

    public onExit(): void {
        this.getRouter().getRoute(RouteName.Detail)?.detachPatternMatched(this.onPatternMatched, this);
    }

    /** Binds the view to the request whose key is in the arguments of the detail route. */
    private readonly onPatternMatched = (event: Route$PatternMatchedEvent): void => {
        const routeArguments = event.getParameter("arguments") as DetailRouteArguments;
        void this.bindRequest(routeArguments.uuid, routeArguments.active === "true");
    };

    /**
     * Binds the view to the kept-alive context of the request with the given key. The key predicate
     * is calculated from the metadata, which may still be loading when the URL is opened directly.
     * The context of the request shown before is released afterwards: the list binding manages it
     * again and destroys it when its row is no longer in the list.
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
        const previousContext = this.requestContext;
        if (previousContext?.getPath() === path) {
            return;
        }
        const context = model.getKeepAliveContext(path);
        this.getView()?.setBindingContext(context);
        this.requestContext = context;
        if (previousContext?.isKeepAlive()) {
            previousContext.setKeepAlive(false);
        }
    }
}
