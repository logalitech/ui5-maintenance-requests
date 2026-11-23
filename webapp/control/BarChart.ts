import Event from "sap/ui/base/Event";
import Control from "sap/ui/core/Control";
import type { MetadataOptions } from "sap/ui/core/Element";
import RenderManager from "sap/ui/core/RenderManager";
import Theming from "sap/ui/core/Theming";
import { ValueState } from "sap/ui/core/library";
import Parameters from "sap/ui/core/theming/Parameters";
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from "chart.js";
import type { ChartConfiguration } from "chart.js";
import type BarChartItem from "./BarChartItem";

/** Theming parameters that give the colors of the chart, by the state of the bars, and its text and grid. */
enum ThemeParameter {
    Neutral = "sapNeutralColor",
    Information = "sapInformativeColor",
    Positive = "sapPositiveColor",
    Critical = "sapCriticalColor",
    Negative = "sapNegativeColor",
    Text = "sapTextColor",
    Grid = "sapList_BorderColor",
    FontFamily = "sapFontFamily"
}

/** The resolved values of the theming parameters. */
type ThemeValues = Partial<Record<ThemeParameter, string>>;

/** Parameters of the select event of the BarChart. */
export interface BarChart$SelectEventParameters {
    /** Key of the bar that has been pressed. */
    key: string;
}

/** The select event of the BarChart, for the handlers of the views. */
export type BarChart$SelectEvent = Event<BarChart$SelectEventParameters>;

/** Rem that each bar of a horizontal chart needs, the rem of its axis and margins, and the least height. */
enum HorizontalHeight {
    PerBar = 2,
    Fixed = 4,
    Minimum = 12
}

/**
 * Bar chart of one series, drawn with Chart.js (npm package chart.js, which ui5-tooling-modules bundles into the
 * application). The control hides the library: the application declares the bars as BarChartItem aggregations
 * and listens to the select event, which carries the key of the bar that the user pressed.
 *
 * Chart.js draws on a canvas, which the control creates after each rendering and destroys before the next one
 * and on exit. The canvas is exposed to assistive technologies as an image with the text of ariaLabel; the
 * data are available to keyboard and screen reader users in the table that the view shows next to the chart.
 * The colors come from the theme, so that the chart follows the theme of the application.
 *
 * @namespace sapui5.maintenance.control
 */
export default class BarChart extends Control {

    public static readonly metadata: MetadataOptions = {
        properties: {
            /** Text that describes the chart for assistive technologies. */
            ariaLabel: { type: "string", defaultValue: "" },
            /** Draws horizontal bars, for categories with long texts or many categories. */
            horizontal: { type: "boolean", defaultValue: false },
            /** Height of a chart with vertical bars. */
            height: { type: "sap.ui.core.CSSSize", defaultValue: "18rem" }
        },
        // the view declares the bars as direct children of the control, so the aggregation is the default one
        defaultAggregation: "items",
        aggregations: {
            /** The bars. */
            items: { type: "sapui5.maintenance.control.BarChartItem", multiple: true, singularName: "item" }
        },
        events: {
            /** A bar has been pressed. */
            select: {
                parameters: {
                    /** Key of the bar. */
                    key: { type: "string" }
                }
            }
        }
    };

    public static readonly renderer = {
        apiVersion: 2,
        render(renderManager: RenderManager, control: BarChart): void {
            renderManager.openStart("div", control).class("maintenanceBarChart");
            renderManager.style("height", control.getChartHeight()).openEnd();
            renderManager.openStart("canvas", `${control.getId()}-canvas`)
                .attr("role", "img")
                .attr("aria-label", control.getAriaLabel())
                .openEnd().close("canvas");
            renderManager.close("div");
        }
    };

    declare getAriaLabel: () => string;
    declare getHorizontal: () => boolean;
    declare getHeight: () => string;
    declare getItems: () => BarChartItem[];
    declare fireSelect: (parameters: { key: string }) => this;

    private chart?: Chart<"bar">;

    public init(): void {
        Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);
        Theming.attachApplied(this.onThemeApplied);
    }

    public exit(): void {
        Theming.detachApplied(this.onThemeApplied);
        this.destroyChart();
    }

    public onBeforeRendering(): void {
        this.destroyChart();
    }

    public onAfterRendering(): void {
        const values = Parameters.get({
            name: Object.values(ThemeParameter),
            callback: (resolved) => this.drawChart(resolved as ThemeValues)
        });
        if (values) {
            this.drawChart(values as ThemeValues);
        }
    }

    /** Height of the chart: the property, or for horizontal bars the height that all bars need. */
    public getChartHeight(): string {
        if (!this.getHorizontal()) {
            return this.getHeight();
        }
        const rem = Math.max(
            HorizontalHeight.Minimum,
            this.getItems().length * HorizontalHeight.PerBar + HorizontalHeight.Fixed
        );
        return `${rem}rem`;
    }

    /** The colors of the theme are read again when the theme changes. */
    private readonly onThemeApplied = (): void => {
        this.invalidate();
    };

    /**
     * Draws the chart on the canvas of the current rendering. It does nothing when the control has been rendered
     * again or destroyed in the meantime (the parameters of a theme that is still loading arrive later).
     */
    private drawChart(values: ThemeValues): void {
        const canvas = this.getDomRef("canvas") as HTMLCanvasElement | null;
        if (!canvas || this.chart) {
            return;
        }
        const items = this.getItems();
        const horizontal = this.getHorizontal();
        const textColor = values[ThemeParameter.Text];
        const gridColor = values[ThemeParameter.Grid];
        const configuration: ChartConfiguration<"bar"> = {
            type: "bar",
            data: {
                labels: items.map((item) => item.getLabel()),
                datasets: [{
                    data: items.map((item) => item.getValue()),
                    backgroundColor: items.map((item) => this.getStateColor(item.getState(), values))
                }]
            },
            options: {
                indexAxis: horizontal ? "y" : "x",
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                font: { family: values[ThemeParameter.FontFamily] },
                color: textColor,
                scales: {
                    [horizontal ? "y" : "x"]: {
                        grid: { display: false },
                        ticks: { color: textColor }
                    },
                    [horizontal ? "x" : "y"]: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: textColor, precision: 0 }
                    }
                },
                plugins: {
                    legend: { display: false }
                },
                onClick: (_event, elements) => {
                    const item = elements.length > 0 ? items[elements[0].index] : undefined;
                    if (item) {
                        this.fireSelect({ key: item.getKey() });
                    }
                }
            }
        };
        this.chart = new Chart(canvas, configuration);
    }

    /** The color of the theme for the state of a bar. */
    private getStateColor(state: ValueState, values: ThemeValues): string | undefined {
        switch (state) {
            case ValueState.Information:
                return values[ThemeParameter.Information];
            case ValueState.Success:
                return values[ThemeParameter.Positive];
            case ValueState.Warning:
                return values[ThemeParameter.Critical];
            case ValueState.Error:
                return values[ThemeParameter.Negative];
            default:
                return values[ThemeParameter.Neutral];
        }
    }

    private destroyChart(): void {
        this.chart?.destroy();
        this.chart = undefined;
    }
}
