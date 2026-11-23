import formatter from "sapui5/maintenance/model/formatter";
import { Criticality } from "sapui5/maintenance/model/constants";
import { ValueState } from "sap/ui/core/library";

QUnit.module("formatter.criticalityState");

QUnit.test("Converts each criticality of the service scale to its value state", function (assert) {
    assert.strictEqual(formatter.criticalityState(Criticality.Neutral), ValueState.None, "0 (neutral) is None");
    assert.strictEqual(formatter.criticalityState(Criticality.Negative), ValueState.Error, "1 (negative) is Error");
    assert.strictEqual(formatter.criticalityState(Criticality.Critical), ValueState.Warning, "2 (critical) is Warning");
    assert.strictEqual(formatter.criticalityState(Criticality.Positive), ValueState.Success, "3 (positive) is Success");
    assert.strictEqual(formatter.criticalityState(Criticality.Information), ValueState.Information,
        "5 (information) is Information");
});

QUnit.test("Converts the criticalities of the statuses and priorities of the service", function (assert) {
    // Statuses: NW 0, AS 5, IP 2, CO 3, RJ 1 (docs/servicio.md, section 8.1)
    assert.strictEqual(formatter.criticalityState(0), ValueState.None, "New is None");
    assert.strictEqual(formatter.criticalityState(5), ValueState.Information, "Assigned is Information");
    assert.strictEqual(formatter.criticalityState(2), ValueState.Warning, "In progress is Warning");
    assert.strictEqual(formatter.criticalityState(3), ValueState.Success, "Completed is Success");
    assert.strictEqual(formatter.criticalityState(1), ValueState.Error, "Rejected is Error");
    // Priorities: very high 1, high 2, medium 0, low 0 (docs/servicio.md, section 8.2)
    assert.strictEqual(formatter.criticalityState(1), ValueState.Error, "Very high is Error");
    assert.strictEqual(formatter.criticalityState(2), ValueState.Warning, "High is Warning");
    assert.strictEqual(formatter.criticalityState(0), ValueState.None, "Medium and low are None");
});

QUnit.test("Unknown or missing criticalities are neutral", function (assert) {
    assert.strictEqual(formatter.criticalityState(4), ValueState.None, "4 is not in the scale");
    assert.strictEqual(formatter.criticalityState(99), ValueState.None, "99 is not in the scale");
    assert.strictEqual(formatter.criticalityState(-1), ValueState.None, "-1 is not in the scale");
    assert.strictEqual(formatter.criticalityState(null), ValueState.None, "null is None");
    assert.strictEqual(formatter.criticalityState(undefined), ValueState.None, "undefined is None");
});

QUnit.module("formatter.listTitle");

QUnit.test("Shows the title with the count when the count is known", function (assert) {
    assert.strictEqual(formatter.listTitle("Requests", "Requests ({0})", 60), "Requests (60)", "60 requests");
    assert.strictEqual(formatter.listTitle("Requests", "Requests ({0})", 0), "Requests (0)", "0 is a known count");
    assert.strictEqual(formatter.listTitle("Avisos", "Avisos ({0})", 12), "Avisos (12)", "Spanish pattern");
});

QUnit.test("Shows the title alone while the count is unknown", function (assert) {
    assert.strictEqual(formatter.listTitle("Requests", "Requests ({0})", undefined), "Requests", "undefined count");
    assert.strictEqual(formatter.listTitle("Requests", "Requests ({0})", null), "Requests", "null count");
});
