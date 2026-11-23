import formatMessage from "sap/base/strings/formatMessage";
import { ValueState } from "sap/ui/core/library";
import { Criticality } from "./constants";

/**
 * Formatters of the views. The views load this module with core:require and bind the functions
 * as "formatter.<name>"; the bound parts use targetType "any" so that the raw model values arrive.
 */
export default {

    /**
     * Value state that shows the criticality sent by the service (docs/servicio.md, section 8):
     * 0 neutral, 1 negative, 2 critical, 3 positive and 5 information. Any other value is neutral.
     * @param criticality Criticality of the service (PriorityCriticality, StatusCriticality)
     */
    criticalityState(criticality: number | null | undefined): ValueState {
        switch (criticality) {
            case Criticality.Negative:
                return ValueState.Error;
            case Criticality.Critical:
                return ValueState.Warning;
            case Criticality.Positive:
                return ValueState.Success;
            case Criticality.Information:
                return ValueState.Information;
            default:
                return ValueState.None;
        }
    },

    /**
     * Title of a list with the number of its entries, for example "Requests (60)".
     * While the count is unknown, the title without the count.
     * @param title Title without count
     * @param pattern Title with the placeholder of the count, for example "Requests ({0})"
     * @param count Number of entries; undefined or null while unknown
     */
    listTitle(title: string, pattern: string, count: number | null | undefined): string {
        if (count === null || count === undefined) {
            return title;
        }
        return formatMessage(pattern, [count]);
    }
};
