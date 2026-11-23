import { ValueState } from "sap/ui/core/library";
import Sorter from "sap/ui/model/Sorter";
import Context from "sap/ui/model/odata/v4/Context";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import formatter from "../model/formatter";
import { Indicator, IndicatorEntitySet, ListQuery, RequestPriority, RequestStatus } from "../model/constants";
import type { Plant, RequestStat, Status } from "../model/types";

/** A bar of a chart and a row of its table: the code, its text, the number of requests and the state that colors it. */
export interface ChartEntry {
    key: string;
    label: string;
    count: number;
    state: ValueState;
}

/** The data of the indicators view. */
export interface Indicators {
    /** Total of active requests: the sum of all rows of RequestStats. */
    total: number;
    /** The four numeric indicators. */
    counts: Record<Indicator, number>;
    /** Requests by status, in the order of the statuses; statuses without requests are included with zero. */
    byStatus: ChartEntry[];
    /** Requests by plant, from the plant with most requests; plants without requests are not included. */
    byPlant: ChartEntry[];
}

/**
 * Data of the indicators (HU-08). The entity set RequestStats returns one row per combination of plant, status
 * and priority, with the number of active requests and only the codes; this service reads it together with the code
 * lists that give the texts, and sums the rows into the totals that the view shows.
 */
export default class IndicatorService {

    /** Statuses of an open request: the work has not started. */
    private static readonly OPEN_STATUSES: string[] = [RequestStatus.New, RequestStatus.Assigned];

    /** The filters of the list for each indicator. */
    private static readonly LIST_QUERIES: Record<Indicator, ListQuery> = {
        [Indicator.Open]: { status: IndicatorService.OPEN_STATUSES.join(",") },
        [Indicator.InProgress]: { status: RequestStatus.InProgress },
        [Indicator.Completed]: { status: RequestStatus.Completed },
        [Indicator.VeryHigh]: { priority: RequestPriority.VeryHigh }
    };

    /** Maximum number of rows read from each entity set: more than the combinations that RequestStats can have. */
    private static readonly MAX_ROWS = 1000;

    public constructor(private readonly model: ODataModel) {
    }

    /**
     * The filters that the list applies for each indicator: the list of the requests that the indicator counts.
     * @param indicator The indicator
     */
    public static getListQuery(indicator: Indicator): ListQuery {
        return { ...IndicatorService.LIST_QUERIES[indicator] };
    }

    /**
     * Sums the rows of RequestStats into the indicators and the data of the two charts.
     * @param stats Rows of RequestStats
     * @param statuses Statuses, in the order of presentation
     * @param plants Plants, which give the names of the plant codes
     */
    public static aggregate(stats: RequestStat[], statuses: Status[], plants: Plant[]): Indicators {
        const byStatus = new Map<string, number>();
        const byPlant = new Map<string, number>();
        let total = 0;
        let veryHigh = 0;
        for (const row of stats) {
            total += row.RequestCount;
            byStatus.set(row.Status, (byStatus.get(row.Status) ?? 0) + row.RequestCount);
            byPlant.set(row.Plant, (byPlant.get(row.Plant) ?? 0) + row.RequestCount);
            if (row.Priority === (RequestPriority.VeryHigh as string)) {
                veryHigh += row.RequestCount;
            }
        }
        const statusCount = (status: string): number => byStatus.get(status) ?? 0;
        const plantNames = new Map(plants.map((plant) => [plant.Plant, plant.PlantName]));
        return {
            total,
            counts: {
                [Indicator.Open]: IndicatorService.OPEN_STATUSES.reduce((sum, status) => sum + statusCount(status), 0),
                [Indicator.InProgress]: statusCount(RequestStatus.InProgress),
                [Indicator.Completed]: statusCount(RequestStatus.Completed),
                [Indicator.VeryHigh]: veryHigh
            },
            byStatus: statuses.map((status) => ({
                key: status.Status,
                label: status.StatusText,
                count: statusCount(status.Status),
                state: formatter.criticalityState(status.Criticality)
            })),
            byPlant: [...byPlant.entries()]
                .map(([plant, count]) => ({
                    key: plant,
                    label: plantNames.get(plant) ?? plant,
                    count,
                    state: ValueState.Information
                }))
                .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label))
        };
    }

    /**
     * Reads RequestStats and the code lists in one batch and sums them. If a read fails, the model reports the
     * error to the error handler and the promise is rejected.
     */
    public async load(): Promise<Indicators> {
        const [stats, statuses, plants] = await Promise.all([
            this.read<RequestStat>(IndicatorEntitySet.RequestStats),
            this.read<Status>(IndicatorEntitySet.Statuses, new Sorter("SortOrder")),
            this.read<Plant>(IndicatorEntitySet.Plants)
        ]);
        return IndicatorService.aggregate(stats, statuses, plants);
    }

    /** The rows of an entity set, read with a list binding that is destroyed afterwards. */
    private async read<T extends object>(path: IndicatorEntitySet, sorter?: Sorter): Promise<T[]> {
        const binding = this.model.bindList(path, undefined, sorter);
        try {
            const contexts: Context[] = await binding.requestContexts(0, IndicatorService.MAX_ROWS);
            return contexts.map((context) => context.getObject() as T);
        } finally {
            binding.destroy();
        }
    }
}
