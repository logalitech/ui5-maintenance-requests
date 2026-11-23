import BaseController from "./BaseController";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import { NavigationActionsTargets } from "sap/f/FlexibleColumnLayoutSemanticHelper";
import Context from "sap/ui/model/odata/v4/Context";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import {
    DetailRouteArguments, EntitySetPath, HttpStatus, RequestProperty, RouteName, TargetName
} from "../model/constants";

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
 * @namespace sapui5.maintenance.controller
 */
export default class RequestDetail extends BaseController {

    /** Format of RequestUUID (Edm.Guid) in the URL. */
    private static readonly UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    /** The kept-alive context of the shown request; undefined until a request is shown. */
    private requestContext?: Context;

    /** Key of the request of the last matched detail route, also while it is being read. */
    private routeKey?: Pick<DetailRouteArguments, "uuid" | "active">;

    public onInit(): void {
        this.getRouter().getRoute(RouteName.Detail)?.attachPatternMatched(this.onPatternMatched, this);
    }

    public onExit(): void {
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
     * its row is no longer in the list.
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
        if (previousContext !== context && previousContext?.isKeepAlive()) {
            previousContext.setKeepAlive(false);
        }
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
}
