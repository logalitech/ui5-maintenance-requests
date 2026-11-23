/**
 * Application constants: route names, the criticality scale of the service and the properties
 * of Requests that the controllers read from the contexts of the list.
 */

/** Names of the routes declared in manifest.json (sap.ui5/routing/routes). */
export enum RouteName {
    List = "list",
    Detail = "detail"
}

/**
 * Arguments of the detail route: the two key components of a request and the optional column layout.
 */
export interface DetailRouteArguments {
    uuid: string;
    active: string;
    layout?: string;
}

/** Criticality scale of the service (docs/servicio.md, section 8). */
export enum Criticality {
    Neutral = 0,
    Negative = 1,
    Critical = 2,
    Positive = 3,
    Information = 5
}

/** Properties of the Requests entity set that the controllers read from a context. */
export enum RequestProperty {
    RequestUUID = "RequestUUID",
    IsActiveEntity = "IsActiveEntity"
}
