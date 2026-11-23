import formatMessage from "sap/base/strings/formatMessage";
import { ButtonType, DraftIndicatorState } from "sap/m/library";
import NumberFormat from "sap/ui/core/format/NumberFormat";
import { ValueState } from "sap/ui/core/library";
import Message from "sap/ui/core/message/Message";
import MessageType from "sap/ui/core/message/MessageType";
import { Criticality } from "./constants";

/**
 * The most severe type among the given messages (error, warning, success, information, in this order);
 * undefined without messages or when all of them have the type None.
 * @param messages Messages of the message model
 */
function getHighestMessageType(messages: Message[] | null | undefined): MessageType | undefined {
    const types = new Set((messages ?? []).map((message) => message.getType()));
    return [MessageType.Error, MessageType.Warning, MessageType.Success, MessageType.Information]
        .find((type) => types.has(type));
}

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
    },

    /**
     * Amount of a spare part: quantity by unit price, in the currency of the price, with the
     * decimals of the currency and the format of the locale (the same format as the OData Currency
     * type without code list). The service has no property with this amount. The model delivers
     * Edm.Decimal values as strings; numbers are accepted as well.
     * @param quantity Quantity of the part
     * @param unitPrice Unit price of the part
     * @param currencyCode Currency of the unit price
     * @returns The formatted amount; an empty string while a value is missing
     */
    partAmount(quantity: string | number | null | undefined, unitPrice: string | number | null | undefined,
            currencyCode: string | null | undefined): string {
        if (quantity === null || quantity === undefined || unitPrice === null || unitPrice === undefined
                || !currencyCode) {
            return "";
        }
        return NumberFormat.getCurrencyInstance().format(Number(quantity) * Number(unitPrice), currencyCode);
    },

    /**
     * Text of the saving state of a draft, shown in the footer of the edit mode.
     * @param state Saving state of the draft (detailView>/draftState)
     * @param savingText Text while a change is being sent to the service, for example "Saving draft..."
     * @param savedText Text once the service has saved the last change, for example "Draft saved"
     * @returns The text of the state; an empty text while no change has been made
     */
    draftStateText(state: DraftIndicatorState | null | undefined, savingText: string, savedText: string): string {
        switch (state) {
            case DraftIndicatorState.Saving:
                return savingText;
            case DraftIndicatorState.Saved:
                return savedText;
            default:
                return "";
        }
    },

    /**
     * Type of the message button: the semantic color of the most severe message, as in the footer of an
     * SAP Fiori object page (negative for errors, critical for warnings, success, neutral otherwise).
     * @param messages Messages of the message model
     */
    messagesButtonType(messages: Message[] | null | undefined): ButtonType {
        switch (getHighestMessageType(messages)) {
            case MessageType.Error:
                return ButtonType.Negative;
            case MessageType.Warning:
                return ButtonType.Critical;
            case MessageType.Success:
                return ButtonType.Success;
            default:
                return ButtonType.Neutral;
        }
    },

    /**
     * Icon of the message button: the icon of the most severe message.
     * @param messages Messages of the message model
     */
    messagesButtonIcon(messages: Message[] | null | undefined): string {
        switch (getHighestMessageType(messages)) {
            case MessageType.Error:
                return "sap-icon://error";
            case MessageType.Warning:
                return "sap-icon://alert";
            case MessageType.Success:
                return "sap-icon://sys-enter-2";
            default:
                return "sap-icon://information";
        }
    }
};
