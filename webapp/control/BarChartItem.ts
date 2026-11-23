import Element from "sap/ui/core/Element";
import type { MetadataOptions } from "sap/ui/core/Element";
import { ValueState } from "sap/ui/core/library";

/**
 * A bar of the BarChart: the code that identifies it, its text, its value and the semantic state that gives
 * its color.
 *
 * @namespace sapui5.maintenance.control
 */
export default class BarChartItem extends Element {

    public static readonly metadata: MetadataOptions = {
        properties: {
            /** Code of the bar, delivered by the select event of the chart. */
            key: { type: "string", defaultValue: "" },
            /** Text of the bar: the label of its axis and of its tooltip. */
            label: { type: "string", defaultValue: "" },
            /** Value of the bar. */
            value: { type: "int", defaultValue: 0 },
            /** Semantic state that colors the bar; None is neutral. */
            state: { type: "sap.ui.core.ValueState", defaultValue: ValueState.None }
        }
    };

    declare getKey: () => string;
    declare getLabel: () => string;
    declare getValue: () => number;
    declare getState: () => ValueState;
}
