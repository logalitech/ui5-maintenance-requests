import BaseController from "./BaseController";
import Table from "sap/m/Table";
import Title from "sap/m/Title";
import ListItemBase from "sap/m/ListItemBase";
import { ListBase$ItemPressEvent, ListBase$SelectionChangeEvent } from "sap/m/ListBase";
import { Router$RouteMatchedEvent } from "sap/ui/core/routing/Router";
import Context from "sap/ui/model/odata/v4/Context";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import { DetailRouteArguments, RequestProperty, RouteName } from "../model/constants";

/**
 * List of maintenance requests, shown in the first column.
 *
 * The list binding of the table resolves everything on the server: the fixed draft filter and the
 * count are binding parameters, the initial sorter is a dynamic sorter and the pages of 20 rows
 * come from the growing feature of the table. The count is read from the header context.
 *
 * @namespace sapui5.maintenance.controller
 */
export default class RequestList extends BaseController {

    /** Whether the title of the table is already bound to the header context of the list binding. */
    private countBound = false;

    /** Key of the request shown in the detail, whose row is kept selected; undefined on the list route. */
    private shownRequest?: Pick<DetailRouteArguments, "uuid" | "active">;

    public onInit(): void {
        this.getRouter().attachRouteMatched(this.onRouteMatched, this);
    }

    public onExit(): void {
        this.getRouter().detachRouteMatched(this.onRouteMatched, this);
    }

    /**
     * Binds the title to the header context of the list binding. The binding exists once the view
     * is placed in the layout and receives the model, which is before its first rendering.
     */
    public onBeforeRendering(): void {
        if (!this.countBound) {
            this.bindRequestCount();
        }
    }

    /** Desktop and tablet (SingleSelectMaster): the pressed row is selected and shown in the detail. */
    public onSelectionChange(event: ListBase$SelectionChangeEvent): void {
        if (event.getParameter("selected")) {
            this.showRequest(event.getParameter("listItem"));
        }
    }

    /** Phone (no selection mode): the pressed row is shown in the detail. */
    public onItemPress(event: ListBase$ItemPressEvent): void {
        this.showRequest(event.getParameter("listItem"));
    }

    /** After each update of the rows (first load, growing, filter, sort) the shown request keeps its mark. */
    public onUpdateFinished(): void {
        this.markShownRequest();
    }

    /**
     * Keeps the selected row in sync with the route: the request of the detail route stays marked,
     * also when its URL is opened directly, and the mark is removed when the detail is closed.
     */
    private readonly onRouteMatched = (event: Router$RouteMatchedEvent): void => {
        if (event.getParameter("name") === RouteName.Detail) {
            const routeArguments = event.getParameter("arguments") as DetailRouteArguments;
            this.shownRequest = { uuid: routeArguments.uuid, active: routeArguments.active };
            this.markShownRequest();
        } else {
            this.shownRequest = undefined;
            this.getTable().removeSelections(true);
        }
    };

    /** Navigates to the detail of the request of the given row. */
    private showRequest(item: ListItemBase | undefined): void {
        const context = item?.getBindingContext() as Context | null | undefined;
        if (!context) {
            return;
        }
        const routeArguments: DetailRouteArguments = {
            uuid: context.getProperty(RequestProperty.RequestUUID) as string,
            active: String(context.getProperty(RequestProperty.IsActiveEntity) as boolean)
        };
        this.getRouter().navTo(RouteName.Detail, routeArguments);
    }

    /** Selects the row of the shown request, if the row is loaded. */
    private markShownRequest(): void {
        const shown = this.shownRequest;
        if (!shown) {
            return;
        }
        const table = this.getTable();
        const item = table.getItems().find((row) => {
            const context = row.getBindingContext() as Context | null | undefined;
            return context !== null && context !== undefined
                && context.getProperty(RequestProperty.RequestUUID) === shown.uuid
                && String(context.getProperty(RequestProperty.IsActiveEntity)) === shown.active;
        });
        if (item && !item.getSelected()) {
            table.setSelectedItem(item);
        }
    }

    /** Binds the title of the table to the header context, which provides $count. */
    private bindRequestCount(): void {
        const headerContext = this.getRequestBinding()?.getHeaderContext();
        if (!headerContext) {
            return;
        }
        (this.byId("requestTableTitle") as Title).setBindingContext(headerContext);
        this.countBound = true;
    }

    private getTable(): Table {
        return this.byId("requestTable") as Table;
    }

    private getRequestBinding(): ODataListBinding | undefined {
        return this.getTable().getBinding("items") as ODataListBinding | undefined;
    }
}
