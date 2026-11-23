import BaseController from "./BaseController";
import Table from "sap/m/Table";
import Title from "sap/m/Title";
import ListItemBase from "sap/m/ListItemBase";
import SearchField, { SearchField$SearchEvent } from "sap/m/SearchField";
import MultiComboBox from "sap/m/MultiComboBox";
import ComboBox from "sap/m/ComboBox";
import ViewSettingsDialog, { ViewSettingsDialog$ConfirmEvent } from "sap/m/ViewSettingsDialog";
import { ListBase$ItemPressEvent, ListBase$SelectionChangeEvent } from "sap/m/ListBase";
import { Router$RouteMatchedEvent } from "sap/ui/core/routing/Router";
import { ValueState } from "sap/ui/core/library";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Sorter from "sap/ui/model/Sorter";
import Context from "sap/ui/model/odata/v4/Context";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import ValueHelpService from "../service/ValueHelpService";
import { BindingParameter, DetailRouteArguments, RequestProperty, RouteName, ViewLevel } from "../model/constants";

/**
 * List of maintenance requests, shown in the first column.
 *
 * The list binding of the table resolves everything on the server: the fixed draft filter and the
 * count are binding parameters, the initial sorter is a dynamic sorter and the pages of 20 rows
 * come from the growing feature of the table. The count is read from the header context.
 *
 * Search, filters and sort change that binding: the search text goes to the $search parameter,
 * the filters are application filters (combined with the fixed draft filter) and the sort replaces
 * the dynamic sorter. Each change produces one request; the reset applies all changes between
 * suspend and resume so that it produces one request as well.
 *
 * "Create" creates a draft with the list binding (service/DraftService.ts) and shows it in the detail.
 *
 * @namespace sapui5.maintenance.controller
 */
export default class RequestList extends BaseController {

    /** Whether the title of the table is already bound to the header context of the list binding. */
    private countBound = false;

    /** Key of the request shown in the detail, whose row is kept selected; undefined on the list route. */
    private shownRequest?: Pick<DetailRouteArguments, "uuid" | "active">;

    /** The sort dialog, loaded once from its fragment the first time it is opened. */
    private sortDialog?: Promise<ViewSettingsDialog>;

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

    /**
     * Create: the service creates a new request as a draft, which the list shows at the top and the detail
     * shows in edit mode. If the service rejects the creation, the error handler shows its message.
     */
    public onCreate(): void {
        void this.createRequest();
    }

    /** After each update of the rows (first load, growing, filter, sort) the shown request keeps its mark. */
    public onUpdateFinished(): void {
        this.markShownRequest();
    }

    /**
     * Search (Enter, search button or clear button): the text goes as a quoted phrase to the $search
     * parameter of the list binding, which the service resolves on the request number and the title.
     * An empty text removes the parameter. Changing the parameter refreshes the binding: one request.
     */
    public onSearch(event: SearchField$SearchEvent): void {
        const query = (event.getParameter("query") ?? "").trim();
        this.getRequestBinding()?.changeParameters({
            [BindingParameter.Search]: query ? ValueHelpService.toSearchPhrase(query) : undefined
        });
    }

    /**
     * Change of the status, priority or plant filter: the application filters of the list binding
     * are replaced by the current state of the three controls, combined with "and". The combo
     * boxes only hold a selected key when the text matches an item, so a free text applies no
     * filter. The binding sends no request when the filters are unchanged.
     */
    public onFilterChange(): void {
        this.getRequestBinding()?.filter(this.buildFilters());
    }

    /** Opens the sort dialog; the fragment is loaded the first time. */
    public onOpenSortDialog(): void {
        void this.getSortDialog().then((dialog) => dialog.open());
    }

    /** Confirmation of the sort dialog: the chosen property and direction replace the dynamic sorter. */
    public onSortConfirm(event: ViewSettingsDialog$ConfirmEvent): void {
        const path = event.getParameter("sortItem")?.getKey() ?? RequestProperty.RequestID;
        const descending = event.getParameter("sortDescending") ?? false;
        this.getRequestBinding()?.sort(new Sorter(path, descending));
    }

    /**
     * Resets the search, the three filters (including a text typed by hand and the error mark that
     * the status filter sets on a text that matches no option) and the sort order. The binding is
     * suspended while the changes are applied, so that the resume sends one request.
     */
    public onResetFilters(): void {
        this.getSearchField().setValue("");
        const statusFilter = this.getStatusFilter();
        statusFilter.setSelectedKeys([]);
        statusFilter.setValue("");
        statusFilter.setValueState(ValueState.None);
        for (const comboBox of [this.getPriorityFilter(), this.getPlantFilter()]) {
            comboBox.setSelectedKey("");
            comboBox.setValue("");
        }
        void this.sortDialog?.then((dialog) => {
            dialog.setSelectedSortItem(RequestProperty.RequestID);
            dialog.setSortDescending(true);
        });

        const binding = this.getRequestBinding();
        if (!binding) {
            return;
        }
        binding.suspend();
        binding.filter([]);
        binding.sort(this.createInitialSorter());
        binding.changeParameters({ [BindingParameter.Search]: undefined });
        binding.resume();
    }

    /**
     * Filters of the list from the state of the filter controls. The selected statuses are
     * combined with "or", and the three properties with "and". Explicit conjunctions are used
     * because the binding does not support mixing them with its automatic grouping by path.
     * An empty array removes all application filters.
     */
    private buildFilters(): Filter | Filter[] {
        const filters: Filter[] = [];
        const statuses = this.getStatusFilter().getSelectedKeys();
        if (statuses.length > 0) {
            filters.push(new Filter({
                filters: statuses.map((status) => new Filter(RequestProperty.Status, FilterOperator.EQ, status)),
                and: false
            }));
        }
        const priority = this.getPriorityFilter().getSelectedKey();
        if (priority) {
            filters.push(new Filter(RequestProperty.Priority, FilterOperator.EQ, priority));
        }
        const plant = this.getPlantFilter().getSelectedKey();
        if (plant) {
            filters.push(new Filter(RequestProperty.Plant, FilterOperator.EQ, plant));
        }
        return filters.length > 0 ? new Filter({ filters, and: true }) : [];
    }

    /** The initial sorter of the list, as declared in the view: request number, descending. */
    private createInitialSorter(): Sorter {
        return new Sorter(RequestProperty.RequestID, true);
    }

    /** The sort dialog, loaded once from the fragment SortDialog as a dependent of the view. */
    private getSortDialog(): Promise<ViewSettingsDialog> {
        this.sortDialog ??= this.loadFragment({
            name: "sapui5.maintenance.view.SortDialog"
        }) as Promise<ViewSettingsDialog>;
        return this.sortDialog;
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

    /** Shows the request of the given row in the detail. */
    private showRequest(item: ListItemBase | undefined): void {
        const context = item?.getBindingContext() as Context | null | undefined;
        if (context) {
            this.navigateToRequest(context);
        }
    }

    /**
     * Creates a draft with the list binding and shows it in the detail, once the service has created it
     * and its key is known. The busy indicator blocks the screen meanwhile.
     */
    private async createRequest(): Promise<void> {
        const binding = this.getRequestBinding();
        if (!binding) {
            return;
        }
        let draftContext: Context;
        try {
            draftContext = await this.runBusy(() => this.getDraftService().create(binding));
        } catch {
            // the model has reported the error of the service, and the error handler shows it
            return;
        }
        this.navigateToRequest(draftContext);
    }

    /**
     * Navigates to the detail of the request of the given context, with the layout that the semantic helper
     * suggests for the detail level: the current two-column layout is kept (also when the user has
     * widened the list with the arrow of the column separator), and the default one is used otherwise.
     */
    private navigateToRequest(context: Context): void {
        const routeArguments: DetailRouteArguments = {
            uuid: context.getProperty(RequestProperty.RequestUUID) as string,
            active: String(context.getProperty(RequestProperty.IsActiveEntity) as boolean),
            layout: this.getComponent().getHelper().getNextUIState(ViewLevel.Detail).layout
        };
        this.getRouter().navTo(RouteName.Detail, routeArguments);
    }

    /**
     * Selects the row of the shown request, if the row is loaded. Otherwise no row stays marked: the
     * row of the request shown before, or a selection kept by the table after a filter, is removed.
     */
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
        if (!item) {
            table.removeSelections(true);
        } else if (!item.getSelected()) {
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

    private getSearchField(): SearchField {
        return this.byId("searchField") as SearchField;
    }

    private getStatusFilter(): MultiComboBox {
        return this.byId("statusFilter") as MultiComboBox;
    }

    private getPriorityFilter(): ComboBox {
        return this.byId("priorityFilter") as ComboBox;
    }

    private getPlantFilter(): ComboBox {
        return this.byId("plantFilter") as ComboBox;
    }

    private getRequestBinding(): ODataListBinding | undefined {
        return this.getTable().getBinding("items") as ODataListBinding | undefined;
    }
}
