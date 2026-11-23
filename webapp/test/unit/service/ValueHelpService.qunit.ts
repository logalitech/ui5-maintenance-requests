import ValueHelpService from "sapui5/maintenance/service/ValueHelpService";
import { ValueHelpEntity } from "sapui5/maintenance/model/constants";

QUnit.module("ValueHelpService.toSearchPhrase");

QUnit.test("Puts the text between double quotes", function (assert) {
    assert.strictEqual(ValueHelpService.toSearchPhrase("pump"), "\"pump\"");
});

QUnit.test("Escapes double quotes and backslashes", function (assert) {
    assert.strictEqual(ValueHelpService.toSearchPhrase("a\"b\\c"), "\"a\\\"b\\\\c\"");
});

QUnit.module("ValueHelpService.normalizeCode");

QUnit.test("Removes the leading zeros of an equipment code", function (assert) {
    assert.strictEqual(ValueHelpService.normalizeCode(ValueHelpEntity.Equipment, " 000224100001 "), "224100001");
});

QUnit.test("Keeps the code of a plant or a material as it is, without the blanks around it", function (assert) {
    assert.strictEqual(ValueHelpService.normalizeCode(ValueHelpEntity.Plant, " 0010 "), "0010");
    assert.strictEqual(ValueHelpService.normalizeCode(ValueHelpEntity.Product, "ANGLE_GRIND"), "ANGLE_GRIND");
});
