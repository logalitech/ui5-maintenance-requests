/**
 * Application constants: route names and, in later stories, status and priority codes.
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
