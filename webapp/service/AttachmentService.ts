import Messaging from "sap/ui/core/Messaging";
import Message from "sap/ui/core/message/Message";
import MessageType from "sap/ui/core/message/MessageType";
import Context from "sap/ui/model/odata/v4/Context";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { AttachmentLimit, AttachmentMediaType, AttachmentProperty, AttachmentRejection } from "../model/constants";
import type DraftService from "./DraftService";

/** Body of an error response of the service (OData V4 JSON format): the members that the service uses. */
interface ODataErrorResponse {
    error?: {
        message?: string;
    };
}

/**
 * Binary content of the attachments of a request (docs/servicio.md, section 7). This is the only module of the
 * application that sends requests of its own: the OData V4 model reads and writes the entities, but not the
 * content of a stream property.
 *
 * The content is the stream property Attachment (Edm.Stream) of the entity type AttachmentsType. To read it, a
 * view binds that property: the model types it as sap.ui.model.odata.type.Stream, which only supports reading,
 * and its value is the URL of the content (service URL, resource path of the binding, key predicate and property),
 * for a control property of type sap.ui.core.URI such as the source of an image. The model builds that URL
 * whether the entity has content or not; the browser reads the content from it.
 *
 * To attach a file to a draft, the service needs two requests in this order: the creation of the entity on the
 * navigation of the draft (POST .../_Attachment, with file name and media type), and the PUT request of the content
 * to the URL of its stream property (section 7.3). The service sets FileName and MimeType from the headers of the
 * PUT request, and the ETag of the entity changes.
 *
 * The entity is created with a list binding of its own, not with the list binding of the view, so that the view
 * shows the new attachment once its content is on the service. A row shown earlier would request the URL of the
 * content while it is still empty; that URL does not change when the content arrives, so the thumbnail would not
 * be loaded again.
 *
 * A failed upload is reported like a failed request of the model: as a technical message in sap.ui.core.Messaging,
 * which the error handler of the application shows (controller/ErrorHandler.ts).
 */
export default class AttachmentService {

    /** Bytes in a megabyte, as sap.ui.unified.FileUploader counts them. */
    private static readonly BYTES_PER_MEGABYTE = 1024 * 1024;

    /** Instance annotation of an entity that holds its ETag. */
    private static readonly ETAG = "@odata.etag";

    /** If-Match value for any ETag, which the service accepts for the upload as well (docs/servicio.md, section 7.3). */
    private static readonly ANY_ETAG = "*";

    /**
     * Characters of a file name that cannot be sent in the quoted file name of the header Content-Disposition: a
     * quotation mark or a backslash would end or escape the quoted string, and fetch rejects a header value with
     * control characters or with characters outside ISO-8859-1.
     */
    private static readonly HEADER_UNSAFE_CHARACTERS = /["\\]|[^\x20-\xff]/gu;

    /** Replacement of a character that cannot be sent in the header Content-Disposition. */
    private static readonly HEADER_REPLACEMENT = "_";

    private readonly model: ODataModel;

    private readonly draftService: DraftService;

    /**
     * @param model The OData V4 model of the service
     * @param draftService The draft handling, which creates and deletes the attachment entities in the draft
     */
    constructor(model: ODataModel, draftService: DraftService) {
        this.model = model;
        this.draftService = draftService;
    }

    /**
     * Checks a file against the rules of the application, before anything is sent to the service: one of the
     * accepted media types (AttachmentMediaType) and at most AttachmentLimit.MaxFileSizeMB. A file whose media type
     * the browser does not know has an empty type, and is rejected.
     * @param file The file chosen by the user
     * @returns The reason why the file cannot be attached; undefined if it can be attached
     */
    public checkFile(file: File): AttachmentRejection | undefined {
        if (!(Object.values(AttachmentMediaType) as string[]).includes(file.type)) {
            return AttachmentRejection.Type;
        }
        if (file.size > AttachmentLimit.MaxFileSizeMB * AttachmentService.BYTES_PER_MEGABYTE) {
            return AttachmentRejection.Size;
        }
        return undefined;
    }

    /**
     * Attaches a file to a draft and shows it in the attachments of the draft:
     * 1. The draft service creates the entity, with the file name and the media type, on the navigation of the draft
     *    that the list binding of the view uses (POST Requests(...,IsActiveEntity=false)/_Attachment), in the group
     *    $auto. If the service rejects the creation, the model reports the error.
     * 2. The content is sent (upload). If the upload fails, the created entity is deleted again, so that the draft
     *    keeps no attachment without content.
     * 3. The attachments of the draft are loaded again, as a side effect of the change on the navigation property:
     *    the list binding of the view reads its collection, with the new attachment, the FileName and MimeType that
     *    the service has set from the headers, and its current ETag. The model first sends the pending changes of
     *    the group $auto, such as the change of a comment.
     * The file is not checked here: call checkFile first.
     * @param listBinding The list binding of the attachments of the draft in the view (navigation _Attachment)
     * @param file The file to attach
     * @returns A promise that is resolved once the list binding shows the new attachment, and rejected if the
     *   creation, the upload or the reading of the attachments fails, once the error has been reported
     */
    public async add(listBinding: ODataListBinding, file: File): Promise<void> {
        const draftContext = listBinding.getContext() as Context | undefined;
        const navigationPath = listBinding.getPath();
        if (!draftContext || !navigationPath) {
            throw new Error(`The list binding ${listBinding.toString()} is not bound to a draft`);
        }
        const creationBinding = this.model.bindList(navigationPath, draftContext, undefined, undefined, {
            $$ownRequest: true
        });
        try {
            const attachmentContext = await this.draftService.create(creationBinding, {
                [AttachmentProperty.FileName]: file.name,
                [AttachmentProperty.MimeType]: file.type
            });
            try {
                await this.upload(attachmentContext, file);
            } catch (error) {
                await this.deleteAttachment(attachmentContext);
                throw error;
            }
        } finally {
            creationBinding.destroy();
        }
        await draftContext.requestSideEffects([{ $NavigationPropertyPath: navigationPath }]);
    }

    /**
     * Sends the content of a file to the stream property of a created attachment (PUT, answered with 204):
     * - URL: the service URL and the canonical path of the attachment, Attachments(AttachmentUUID=...,
     *   IsActiveEntity=false), followed by the stream property.
     * - The headers of the model (getHttpHeaders): the language and the X-CSRF-Token, which the model has fetched
     *   for the creation of the attachment.
     * - If-Match: mandatory, the service answers 428 without it. The ETag of the attachment, from its context.
     * - Content-Type and Content-Disposition: the service sets MimeType and FileName from them. Without
     *   Content-Disposition, the service would leave the file name empty.
     * A failed request is reported as a technical message, with the HTTP status of the response.
     * @param attachmentContext The context of the created attachment
     * @param file The file whose content is sent
     */
    private async upload(attachmentContext: Context, file: File): Promise<void> {
        const canonicalPath = await attachmentContext.requestCanonicalPath();
        const url = `${this.model.getServiceUrl()}${canonicalPath.slice(1)}/${AttachmentProperty.Content}`;
        const etag = attachmentContext.getProperty(AttachmentService.ETAG) as string | undefined;
        let response: Response;
        try {
            response = await fetch(url, {
                method: "PUT",
                headers: {
                    ...this.model.getHttpHeaders(),
                    "Content-Type": file.type,
                    "Content-Disposition": `attachment; filename="${this.toHeaderFileName(file.name)}"`,
                    "If-Match": etag ?? AttachmentService.ANY_ETAG
                },
                body: file
            });
        } catch (error) {
            // no response: the connection failed
            this.reportUploadError(error instanceof Error ? error.message : String(error));
            throw error;
        }
        if (!response.ok) {
            const message = await this.readErrorMessage(response);
            this.reportUploadError(message, response.status);
            throw new Error(`The upload to ${url} failed with the status ${response.status}: ${message}`);
        }
    }

    /**
     * Deletes an attachment whose content could not be sent. If the service rejects the deletion, the model reports
     * the error, and the attachment stays in the draft without content.
     * @param attachmentContext The context of the created attachment
     */
    private async deleteAttachment(attachmentContext: Context): Promise<void> {
        try {
            await this.draftService.deleteItem(attachmentContext);
        } catch {
            // the model has reported the error of the service, and the error handler shows it
        }
    }

    /**
     * The message of an error response of the service (error.message of the OData JSON format); the status text
     * of the response when its body contains no such message.
     * @param response The error response
     */
    private async readErrorMessage(response: Response): Promise<string> {
        try {
            const body = await response.json() as ODataErrorResponse;
            return body.error?.message ?? response.statusText;
        } catch {
            return response.statusText;
        }
    }

    /**
     * Reports a failed upload like the model reports a failed request: a technical error message in
     * sap.ui.core.Messaging, with the HTTP status in its technical details. The error handler shows it in its
     * message box and removes it.
     * @param message The message of the service, or of the browser when there is no response
     * @param httpStatus The HTTP status of the response; undefined without a response
     */
    private reportUploadError(message: string, httpStatus?: number): void {
        Messaging.addMessages(new Message({
            message,
            type: MessageType.Error,
            technical: true,
            technicalDetails: { httpStatus }
        }));
    }

    /**
     * The file name for the quoted file name of the header Content-Disposition: each character that cannot be sent
     * in it (HEADER_UNSAFE_CHARACTERS) is replaced with an underscore.
     * @param fileName The name of the file
     */
    private toHeaderFileName(fileName: string): string {
        return fileName.replace(AttachmentService.HEADER_UNSAFE_CHARACTERS, AttachmentService.HEADER_REPLACEMENT);
    }
}
