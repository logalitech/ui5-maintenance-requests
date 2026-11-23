import AttachmentService from "sapui5/maintenance/service/AttachmentService";
import DraftService from "sapui5/maintenance/service/DraftService";
import { AttachmentLimit, AttachmentRejection } from "sapui5/maintenance/model/constants";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";

/**
 * Creates the attachment service with a model that sends no request: the check of a file does not use the service.
 */
function createAttachmentService(): AttachmentService {
    const model = new ODataModel({
        serviceUrl: "/sap/opu/odata4/sap/zui_mnt_request_o4/srvd/sap/zui_mnt_request/0001/"
    });
    return new AttachmentService(model, new DraftService(model));
}

/**
 * Creates a file with the given name, media type and size in bytes.
 */
function createFile(name: string, type: string, size: number): File {
    return new File([new Uint8Array(size)], name, { type });
}

/** Maximum size of an attachment in bytes (megabytes of 1024 x 1024 bytes). */
function getMaxFileSize(): number {
    return AttachmentLimit.MaxFileSizeMB * 1024 * 1024;
}

QUnit.module("AttachmentService.checkFile");

QUnit.test("Accepts PNG, JPEG and SVG images and PDF documents", function (assert) {
    const service = createAttachmentService();
    assert.strictEqual(service.checkFile(createFile("photo.png", "image/png", 1024)), undefined, "PNG image");
    assert.strictEqual(service.checkFile(createFile("photo.jpg", "image/jpeg", 1024)), undefined, "JPEG image");
    assert.strictEqual(service.checkFile(createFile("sketch.svg", "image/svg+xml", 1024)), undefined, "SVG image");
    assert.strictEqual(service.checkFile(createFile("manual.pdf", "application/pdf", 1024)), undefined,
        "PDF document");
});

QUnit.test("Rejects the other media types", function (assert) {
    const service = createAttachmentService();
    assert.strictEqual(service.checkFile(createFile("animation.gif", "image/gif", 1024)), AttachmentRejection.Type,
        "GIF image");
    assert.strictEqual(service.checkFile(createFile("notes.txt", "text/plain", 1024)), AttachmentRejection.Type,
        "text file");
    assert.strictEqual(service.checkFile(createFile("data.xyz", "", 1024)), AttachmentRejection.Type,
        "media type unknown to the browser");
});

QUnit.test("Accepts files up to the maximum size and rejects larger ones", function (assert) {
    const service = createAttachmentService();
    const maxFileSize = getMaxFileSize();
    assert.strictEqual(service.checkFile(createFile("photo.jpg", "image/jpeg", maxFileSize)), undefined,
        "exactly the maximum size");
    assert.strictEqual(service.checkFile(createFile("photo.jpg", "image/jpeg", maxFileSize + 1)),
        AttachmentRejection.Size, "one byte more than the maximum size");
});
