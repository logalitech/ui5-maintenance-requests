import BaseController from "./BaseController";
import { LayoutType } from "sap/f/library";
import { FlexibleColumnLayout$StateChangeEvent } from "sap/f/FlexibleColumnLayout";
import { Router$RouteMatchedEvent } from "sap/ui/core/routing/Router";
import { DetailRouteArguments, RouteName } from "../model/constants";
import { ActionButtonsInfo, DefaultLayouts } from "../model/models";

/**
 * Root view: keeps the column layout of the FlexibleColumnLayout and the navigation actions of the
 * detail column in sync with the route. Both come from the semantic helper of the layout
 * (Component#getHelper) and are kept in the appView model.
 *
 * @namespace sapui5.maintenance.controller
 */
export default class App extends BaseController {

    /** Arguments of the detail route while it is matched; undefined on the list route. */
    private detailArguments?: DetailRouteArguments;

    public onInit(): void {
        this.getView()?.addStyleClass(this.getComponent().getContentDensityClass());
        this.getRouter().attachRouteMatched(this.onRouteMatched, this);
    }

    public onExit(): void {
        this.getRouter().detachRouteMatched(this.onRouteMatched, this);
    }

    /**
     * The layout or the maximum number of columns of the FlexibleColumnLayout has changed: first rendering,
     * window resize beyond a breakpoint, or the arrow of a column separator. The navigation actions are
     * recalculated. A layout chosen with the arrow is written into the URL, replacing the history entry,
     * so that the URL keeps describing the screen.
     */
    public onStateChange(event: FlexibleColumnLayout$StateChangeEvent): void {
        this.updateActionButtons();
        if (event.getParameter("isNavigationArrow") && this.detailArguments) {
            const routeArguments: DetailRouteArguments = {
                ...this.detailArguments,
                layout: event.getParameter("layout")
            };
            this.getRouter().navTo(RouteName.Detail, routeArguments, true);
        }
    }

    /**
     * Sets the layout of the matched route: the default one-column layout for the list, and for the
     * detail the layout parameter of the URL or the default two-column layout (getDetailLayout). The
     * navigation actions need the rendered layout, so they are calculated once it is rendered.
     */
    private readonly onRouteMatched = (event: Router$RouteMatchedEvent): void => {
        const helper = this.getComponent().getHelper();
        const defaultLayouts = helper.getDefaultLayouts() as DefaultLayouts;
        let layout: LayoutType;
        if (event.getParameter("name") === RouteName.Detail) {
            this.detailArguments = event.getParameter("arguments") as DetailRouteArguments;
            layout = this.getDetailLayout(this.detailArguments.layout, defaultLayouts);
        } else {
            this.detailArguments = undefined;
            layout = defaultLayouts.defaultLayoutType;
        }
        this.getAppViewModel().setProperty("/layout", layout);
        void helper.whenReady().then(() => this.updateActionButtons());
    };

    /**
     * Layout of the detail route. The layout parameter of the URL is used when it is one of the layouts
     * of the detail level (two columns or the detail in full screen). A missing parameter, or a value
     * written by hand that is not one of those layouts, gives the default two-column layout, without error.
     * @param layout Layout parameter of the URL
     * @param defaultLayouts Default layouts of the semantic helper
     */
    private getDetailLayout(layout: string | undefined, defaultLayouts: DefaultLayouts): LayoutType {
        const detailLayouts: string[] = [
            LayoutType.TwoColumnsBeginExpanded,
            LayoutType.TwoColumnsMidExpanded,
            LayoutType.MidColumnFullScreen
        ];
        return layout && detailLayouts.includes(layout)
            ? layout as LayoutType
            : defaultLayouts.defaultTwoColumnLayoutType;
    }

    /**
     * Writes into the appView model the navigation actions that the semantic helper suggests for the
     * current layout and width: full screen and close with two columns, exit full screen and close with
     * the detail in full screen, and only close when there is room for one column (phone).
     */
    private updateActionButtons(): void {
        const actionButtonsInfo = this.getComponent().getHelper().getCurrentUIState().actionButtonsInfo;
        const midColumn: ActionButtonsInfo["midColumn"] = {
            fullScreen: actionButtonsInfo?.midColumn?.fullScreen ?? null,
            exitFullScreen: actionButtonsInfo?.midColumn?.exitFullScreen ?? null,
            closeColumn: actionButtonsInfo?.midColumn?.closeColumn ?? null
        };
        this.getAppViewModel().setProperty("/actionButtonsInfo/midColumn", midColumn);
    }
}
