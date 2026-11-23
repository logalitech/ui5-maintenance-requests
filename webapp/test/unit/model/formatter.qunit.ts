import formatter from "sapui5/maintenance/model/formatter";
import { Criticality } from "sapui5/maintenance/model/constants";
import { ButtonType, DraftIndicatorState } from "sap/m/library";
import { ValueState } from "sap/ui/core/library";
import NumberFormat from "sap/ui/core/format/NumberFormat";
import IconPool from "sap/ui/core/IconPool";
import Message from "sap/ui/core/message/Message";
import MessageType from "sap/ui/core/message/MessageType";

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

QUnit.module("formatter.partAmount");

// The expected texts come from the currency format of the test locale, so that the tests do not depend on it.
QUnit.test("Formats quantity by unit price in the currency of the price", function (assert) {
    const currencyFormat = NumberFormat.getCurrencyInstance();
    assert.strictEqual(formatter.partAmount("3.000", "24.9", "EUR"), currencyFormat.format(74.7, "EUR"),
        "decimal strings, as the model delivers them");
    assert.strictEqual(formatter.partAmount(2, 12.5, "EUR"), currencyFormat.format(25, "EUR"), "numbers");
    assert.strictEqual(formatter.partAmount("3", "10.1", "EUR"), currencyFormat.format(30.3, "EUR"),
        "rounded to the decimals of the currency");
});

QUnit.test("Returns an empty text while a value is missing", function (assert) {
    assert.strictEqual(formatter.partAmount(undefined, "12.5", "EUR"), "", "quantity not loaded");
    assert.strictEqual(formatter.partAmount("2", null, "EUR"), "", "no unit price");
    assert.strictEqual(formatter.partAmount("2", "12.5", ""), "", "no currency");
});

QUnit.module("formatter.isImage");

QUnit.test("Images are the media types that start with image/", function (assert) {
    assert.strictEqual(formatter.isImage("image/png"), true, "PNG image");
    assert.strictEqual(formatter.isImage("image/jpeg"), true, "JPEG image");
    assert.strictEqual(formatter.isImage("image/svg+xml"), true, "SVG image");
});

QUnit.test("Other files and unknown media types are not images", function (assert) {
    assert.strictEqual(formatter.isImage("application/pdf"), false, "PDF document");
    assert.strictEqual(formatter.isImage("text/plain"), false, "text file");
    assert.strictEqual(formatter.isImage(""), false, "empty media type");
    assert.strictEqual(formatter.isImage(null), false, "no media type");
    assert.strictEqual(formatter.isImage(undefined), false, "media type not loaded");
});

QUnit.module("formatter.attachmentIcon");

// The expected icons come from the icon pool, so that the tests do not depend on its assignment of icons.
QUnit.test("Shows the icon of the media type", function (assert) {
    assert.strictEqual(formatter.attachmentIcon("application/pdf"), IconPool.getIconForMimeType("application/pdf"),
        "PDF document");
    assert.strictEqual(formatter.attachmentIcon("text/plain"), IconPool.getIconForMimeType("text/plain"),
        "text file");
});

QUnit.test("Shows the generic icon while the media type is unknown", function (assert) {
    assert.strictEqual(formatter.attachmentIcon(""), IconPool.getIconForMimeType(""), "empty media type");
    assert.strictEqual(formatter.attachmentIcon(null), IconPool.getIconForMimeType(""), "no media type");
});

QUnit.module("formatter.draftStateText");

QUnit.test("Shows the text of the saving state of the draft", function (assert) {
    assert.strictEqual(formatter.draftStateText(DraftIndicatorState.Saving, "Saving draft...", "Draft saved"),
        "Saving draft...", "a change is being sent");
    assert.strictEqual(formatter.draftStateText(DraftIndicatorState.Saved, "Saving draft...", "Draft saved"),
        "Draft saved", "the last change is saved");
});

QUnit.test("Shows no text while no change has been made", function (assert) {
    assert.strictEqual(formatter.draftStateText(DraftIndicatorState.Clear, "Saving draft...", "Draft saved"), "",
        "Clear");
    assert.strictEqual(formatter.draftStateText(undefined, "Saving draft...", "Draft saved"), "", "undefined");
});

QUnit.module("formatter.messagesButtonType and formatter.messagesButtonIcon");

function createMessages(...types: MessageType[]): Message[] {
    return types.map((type) => new Message({ type, message: type }));
}

QUnit.test("Uses the color and the icon of the most severe message", function (assert) {
    const errors = createMessages(MessageType.Information, MessageType.Error, MessageType.Warning);
    assert.strictEqual(formatter.messagesButtonType(errors), ButtonType.Negative, "an error is negative");
    assert.strictEqual(formatter.messagesButtonIcon(errors), "sap-icon://error", "an error has the error icon");
    const warnings = createMessages(MessageType.Success, MessageType.Warning);
    assert.strictEqual(formatter.messagesButtonType(warnings), ButtonType.Critical, "a warning is critical");
    assert.strictEqual(formatter.messagesButtonIcon(warnings), "sap-icon://alert", "a warning has the alert icon");
    const successes = createMessages(MessageType.Information, MessageType.Success);
    assert.strictEqual(formatter.messagesButtonType(successes), ButtonType.Success, "a success is success");
    assert.strictEqual(formatter.messagesButtonIcon(successes), "sap-icon://sys-enter-2",
        "a success has the success icon");
});

QUnit.test("Is neutral with information messages or without messages", function (assert) {
    const information = createMessages(MessageType.Information, MessageType.None);
    assert.strictEqual(formatter.messagesButtonType(information), ButtonType.Neutral, "information is neutral");
    assert.strictEqual(formatter.messagesButtonIcon(information), "sap-icon://information",
        "information has the information icon");
    assert.strictEqual(formatter.messagesButtonType([]), ButtonType.Neutral, "no messages");
    assert.strictEqual(formatter.messagesButtonType(undefined), ButtonType.Neutral, "message model not available");
});
