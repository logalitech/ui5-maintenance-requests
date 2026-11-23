import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";
import { LayoutType } from "sap/f/library";
import { NavigationActionsTargets } from "sap/f/FlexibleColumnLayoutSemanticHelper";

/**
 * Navigation actions of the columns, as the semantic helper of the FlexibleColumnLayout suggests them
 * (UIState actionButtonsInfo). Each action holds its target layout, or null when it is not shown.
 */
export interface ActionButtonsInfo {
    /** Actions of the detail column: full screen, exit full screen and close. */
    midColumn: NavigationActionsTargets;
}

/** Default layouts of the semantic helper (getDefaultLayouts). */
export interface DefaultLayouts {
    /** Layout with one column: the list. */
    defaultLayoutType: LayoutType;
    /** Layout with two columns: the list and the detail. */
    defaultTwoColumnLayoutType: LayoutType;
    /** Layout with three columns; not used by the application. */
    defaultThreeColumnLayoutType: LayoutType;
}

/** State of the user interface kept in the appView model. */
export interface AppViewState {
    /** Column layout of the FlexibleColumnLayout control with id fcl. */
    layout: LayoutType;
    /** Navigation actions of the columns for the current layout and width of the FlexibleColumnLayout. */
    actionButtonsInfo: ActionButtonsInfo;
    /** Busy indicator of the application. */
    busy: boolean;
    /** Edit mode of the detail screen; derived from IsActiveEntity of the displayed request. */
    editable: boolean;
}

export function createDeviceModel(): JSONModel {
    const model = new JSONModel(Device);
    model.setDefaultBindingMode("OneWay");
    return model;
}

export function createAppViewModel(): JSONModel {
    const state: AppViewState = {
        layout: LayoutType.OneColumn,
        actionButtonsInfo: {
            midColumn: {
                fullScreen: null,
                exitFullScreen: null,
                closeColumn: null
            }
        },
        busy: false,
        editable: false
    };
    return new JSONModel(state);
}
