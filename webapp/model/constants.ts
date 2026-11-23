/**
 * Application constants: route and target names, view levels of the column layout, the criticality
 * scale of the service, the paths of the entity sets and the properties of Requests that the
 * controllers read from the contexts of the list.
 */

/** Names of the routes declared in manifest.json (sap.ui5/routing/routes). */
export enum RouteName {
    List = "list",
    Detail = "detail"
}

/** Targets declared in manifest.json (sap.ui5/routing/targets) that the controllers display without a route. */
export enum TargetName {
    NotFound = "notFound"
}

/** View levels of the semantic helper of the FlexibleColumnLayout (getNextUIState). */
export enum ViewLevel {
    List = 0,
    Detail = 1
}

/** HTTP status codes of the service that the application handles. */
export enum HttpStatus {
    NotFound = 404
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

/** Absolute paths of the entity sets that the controllers use to build context paths. */
export enum EntitySetPath {
    Requests = "/Requests"
}

/**
 * Properties of the Requests entity set that the controllers and the draft service read from a context
 * or use as paths of filters and sorters of the list.
 */
export enum RequestProperty {
    RequestUUID = "RequestUUID",
    RequestID = "RequestID",
    IsActiveEntity = "IsActiveEntity",
    HasActiveEntity = "HasActiveEntity",
    HasDraftEntity = "HasDraftEntity",
    Status = "Status",
    Priority = "Priority",
    Plant = "Plant",
    RequiredEndDate = "RequiredEndDate"
}

/** OData system query options that the controllers change on a list binding. */
export enum BindingParameter {
    Search = "$search"
}
