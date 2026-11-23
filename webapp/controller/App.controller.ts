import BaseController from "./BaseController";
import { LayoutType } from "sap/f/library";
import { Router$RouteMatchedEvent } from "sap/ui/core/routing/Router";
import { DetailRouteArguments, RouteName } from "../model/constants";

/**
 * Root view: keeps the column layout of the FlexibleColumnLayout in sync with the route.
 *
 * @namespace sapui5.maintenance.controller
 */
export default class App extends BaseController {

    public onInit(): void {
        this.getView()?.addStyleClass(this.getComponent().getContentDensityClass());
        this.getRouter().attachRouteMatched(this.onRouteMatched, this);
    }

    public onExit(): void {
        this.getRouter().detachRouteMatched(this.onRouteMatched, this);
    }

    /**
     * Sets the layout of the appView model from the matched route: the layout parameter of the
     * detail route when present, two columns for the detail and one column for the list otherwise.
     */
    private readonly onRouteMatched = (event: Router$RouteMatchedEvent): void => {
        const routeName = event.getParameter("name");
        const routeArguments = (event.getParameter("arguments") ?? {}) as Partial<DetailRouteArguments>;
        let layout: string;
        if (routeName === RouteName.Detail) {
            layout = routeArguments.layout ?? LayoutType.TwoColumnsMidExpanded;
        } else {
            layout = LayoutType.OneColumn;
        }
        this.getAppViewModel().setProperty("/layout", layout);
    };
}
