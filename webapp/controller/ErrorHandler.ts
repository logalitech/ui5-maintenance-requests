import BaseObject from "sap/ui/base/Object";
import Messaging from "sap/ui/core/Messaging";
import Message from "sap/ui/core/message/Message";
import ListBinding from "sap/ui/model/ListBinding";
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
 * @namespace sapui5.maintenance.controller
 */
export default class ErrorHandler extends BaseObject {

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
            .filter((message) => message.getTechnical());
        if (messages.length === 0) {
            return;
        }
        // Remove the technical messages so that they are reported once
        Messaging.removeMessages(messages);
        const errors = messages.filter((message) => !this.isNotFound(message));
        if (errors.length === 0 || this.messageOpen) {
            return;
        }
        this.messageOpen = true;
        void this.showError(errors[0]);
    };

    /** Whether the message comes from a 404 response (httpStatus of the technical details of the model). */
    private isNotFound(message: Message): boolean {
        const technicalDetails = message.getTechnicalDetails() as { httpStatus?: number } | undefined;
        return technicalDetails?.httpStatus === HttpStatus.NotFound;
    }

    private async showError(message: Message): Promise<void> {
        const resourceModel = this.component.getModel("i18n") as ResourceModel;
        const bundle = await Promise.resolve(resourceModel.getResourceBundle());
        MessageBox.error(bundle.getText("errorText") ?? "", {
            title: bundle.getText("errorTitle"),
            details: this.getDetails(message),
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
