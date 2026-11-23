import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";
import { LayoutType } from "sap/f/library";

/** State of the user interface kept in the appView model. */
export interface AppViewState {
    /** Column layout of the FlexibleColumnLayout control with id fcl. */
    layout: LayoutType;
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
        busy: false,
        editable: false
    };
    return new JSONModel(state);
}
