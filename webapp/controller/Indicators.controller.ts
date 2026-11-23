import BaseController from "./BaseController";
import { GenericTile$PressEvent } from "sap/m/GenericTile";
import { ListBase$ItemPressEvent } from "sap/m/ListBase";
import JSONModel from "sap/ui/model/json/JSONModel";
import { BarChart$SelectEvent } from "../control/BarChart";
import { Indicator, ListQuery, ListRouteArguments, RouteName } from "../model/constants";
import IndicatorService, { Indicators } from "../service/IndicatorService";

/** State of the indicators model: the busy indicator of the page and the totals that the service delivers. */
interface IndicatorsState extends Indicators {
    busy: boolean;
}

/**
 * Indicators of the requests (HU-08): four numeric indicators and two charts, by status and by plant, each chart with
 * a table of the same data. The totals come from RequestStats (service/IndicatorService.ts) and are read each time
 * the route is matched. Pressing an indicator, a bar or a row of a table opens the list with the matching filter,
 * which the list route receives as query parameters.
 *
 * @namespace sapui5.maintenance.controller
 */
export default class IndicatorsController extends BaseController {

    public onInit(): void {
        this.setModel(new JSONModel(IndicatorsController.createInitialState()), "indicators");
        this.getRouter().getRoute(RouteName.Indicators)?.attachPatternMatched(this.onPatternMatched, this);
    }

    public onExit(): void {
        this.getRouter().getRoute(RouteName.Indicators)?.detachPatternMatched(this.onPatternMatched, this);
    }

    /** Back arrow: the list, with the filters that it had. */
    public onNavBack(): void {
        this.getRouter().navTo(RouteName.List);
    }

    /** An indicator has been pressed: the list of the requests that it counts. */
    public onTilePress(event: GenericTile$PressEvent): void {
        const indicator = event.getSource().data("indicator") as Indicator;
        this.showList(IndicatorService.getListQuery(indicator));
    }

    /** A bar of the chart by status has been pressed: the list of the requests in that status. */
    public onStatusSelect(event: BarChart$SelectEvent): void {
        this.showList({ status: event.getParameter("key") });
    }

    /** A bar of the chart by plant has been pressed: the list of the requests of that plant. */
    public onPlantSelect(event: BarChart$SelectEvent): void {
        this.showList({ plant: event.getParameter("key") });
    }

    /** A row of the table by status has been pressed: the same as its bar. */
    public onStatusRowPress(event: ListBase$ItemPressEvent): void {
        this.showList({ status: this.getRowKey(event) });
    }

    /** A row of the table by plant has been pressed: the same as its bar. */
    public onPlantRowPress(event: ListBase$ItemPressEvent): void {
        this.showList({ plant: this.getRowKey(event) });
    }

    private static createInitialState(): IndicatorsState {
        return {
            busy: false,
            total: 0,
            counts: {
                [Indicator.Open]: 0,
                [Indicator.InProgress]: 0,
                [Indicator.Completed]: 0,
                [Indicator.VeryHigh]: 0
            },
            byStatus: [],
            byPlant: []
        };
    }

    private readonly onPatternMatched = (): void => {
        void this.loadIndicators();
    };

    /** Reads the totals into the model. If the service fails, the error handler shows its message. */
    private async loadIndicators(): Promise<void> {
        const model = this.getModel<JSONModel>("indicators");
        model.setProperty("/busy", true);
        try {
            const indicators = await this.getIndicatorService().load();
            model.setData({ ...indicators, busy: false });
        } catch {
            // the model has reported the error of the service, and the error handler shows it
            model.setProperty("/busy", false);
        }
    }

    /** The code of the row that has been pressed. */
    private getRowKey(event: ListBase$ItemPressEvent): string {
        const context = event.getParameter("listItem")?.getBindingContext("indicators");
        return context?.getProperty("key") as string;
    }

    /** Opens the list with the filters of the query. */
    private showList(query: ListQuery): void {
        const routeArguments: ListRouteArguments = { "?query": query };
        this.getRouter().navTo(RouteName.List, routeArguments);
    }
}
