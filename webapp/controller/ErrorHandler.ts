import BaseObject from "sap/ui/base/Object";
import Messaging from "sap/ui/core/Messaging";
import Message from "sap/ui/core/message/Message";
import ListBinding from "sap/ui/model/ListBinding";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import MessageBox from "sap/m/MessageBox";
import { HttpStatus } from "../model/constants";
import type Component from "../Component";

/**
 * Shows a single message box when the service returns a technical error
 * (no connection, 401, 403, 500).
 *
 * The OData V4 model reports failed requests as technical messages in sap.ui.core.Messaging.
 * This class observes the message model, shows the first technical message in a message box
 * and removes the technical messages, so that the same error is not shown twice.
 *
 * A 404 response is not a technical error: the entity read does not exist, and the screen that reads
 * it shows its not-found page (the detail of a request opened by URL). Its message is removed without
 * a message box.
 *
 * A validation of the service is not a technical error either, although the model marks the main error of
 * every error response as technical: a 400 or 422 response whose message is bound to a field (for example
 * the target Equipment of a failed activation). Its messages stay in the message model, without a message
 * box: the field shows the message and the message button of the detail lists it.
 *
 * A conflict with another user is not a technical error either: a 409 or 423 response, such as the action Edit
 * on a request that another user is editing. The message box shows the message of the service, which says
 * what happened, instead of the generic text.
 *
 * @namespace sapui5.maintenance.controller
 */
export default class ErrorHandler extends BaseObject {

    /** Value of $kind in the metadata of a structural property. */
    private static readonly PROPERTY_KIND = "Property";

    private readonly component: Component;
    private readonly messageBinding: ListBinding;
    private messageOpen = false;

    constructor(component: Component) {
        super();
        this.component = component;
        this.messageBinding = Messaging.getMessageModel().bindList("/");
        this.messageBinding.attachChange(this.onMessagesChanged, this);
    }

    public destroy(): void {
        this.messageBinding.detachChange(this.onMessagesChanged, this);
        this.messageBinding.destroy();
        super.destroy();
    }

    private readonly onMessagesChanged = (): void => {
        const messages = this.messageBinding.getContexts()
            .map((context) => context.getObject() as Message)
            .filter((message) => message.getTechnical() && !this.isValidationMessage(message));
        if (messages.length === 0) {
            return;
        }
        // Remove the technical messages so that they are reported once
        Messaging.removeMessages(messages);
        const errors = messages.filter((message) => this.getHttpStatus(message) !== HttpStatus.NotFound);
        if (errors.length === 0 || this.messageOpen) {
            return;
        }
        this.messageOpen = true;
        void this.showError(errors[0]);
    };

    /**
     * Whether the message is a validation message of the service: it comes from a 400 or 422 response and at
     * least one of its targets is a property of an entity. The model has resolved the target of the service
     * against the entity (for example /Requests(...,IsActiveEntity=false)/Equipment); the metadata tell
     * whether that path ends in a property or in the entity itself.
     */
    private isValidationMessage(message: Message): boolean {
        const httpStatus = this.getHttpStatus(message);
        if (httpStatus !== HttpStatus.BadRequest && httpStatus !== HttpStatus.UnprocessableContent) {
            return false;
        }
        const metaModel = (this.component.getModel() as ODataModel).getMetaModel();
        return message.getTargets().some((target) => {
            if (!target) {
                return false;
            }
            const kind: unknown = metaModel.getObject(`${metaModel.getMetaPath(target)}/$kind`);
            return kind === ErrorHandler.PROPERTY_KIND;
        });
    }

    /**
     * Whether the message reports a conflict with another user: a 409 (Conflict) or 423 (Locked) response, for
     * example to the action Edit on a request that another user is editing.
     */
    private isConflictMessage(message: Message): boolean {
        const httpStatus = this.getHttpStatus(message);
        return httpStatus === HttpStatus.Conflict || httpStatus === HttpStatus.Locked;
    }

    /** HTTP status of the response of the message (httpStatus of the technical details of the model). */
    private getHttpStatus(message: Message): number | undefined {
        const technicalDetails = message.getTechnicalDetails() as { httpStatus?: number } | undefined;
        return technicalDetails?.httpStatus;
    }

    /**
     * Shows the error in a message box: the message of the service for a conflict with another user, the
     * generic text with the message of the service in the details otherwise.
     */
    private async showError(message: Message): Promise<void> {
        const resourceModel = this.component.getModel("i18n") as ResourceModel;
        const bundle = await Promise.resolve(resourceModel.getResourceBundle());
        const conflict = this.isConflictMessage(message);
        MessageBox.error(conflict ? message.getMessage() : bundle.getText("errorText") ?? "", {
            title: bundle.getText("errorTitle"),
            details: conflict ? undefined : this.getDetails(message),
            styleClass: this.component.getContentDensityClass(),
            onClose: () => {
                this.messageOpen = false;
            }
        });
    }

    /** Service message and HTTP status, shown in the details of the message box. */
    private getDetails(message: Message): object {
        return {
            message: message.getMessage(),
            ...message.getTechnicalDetails()
        };
    }
}
