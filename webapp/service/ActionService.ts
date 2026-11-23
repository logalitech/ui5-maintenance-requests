import Context from "sap/ui/model/odata/v4/Context";
import ODataContextBinding from "sap/ui/model/odata/v4/ODataContextBinding";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type { BusinessAction } from "../model/constants";

/**
 * Business actions of the maintenance requests (docs/servicio.md, section 5) and the deletion of a request. The
 * controllers call these methods and never build an action name.
 *
 * The actions are bound to the active request. Each one is invoked with a deferred operation binding relative to the
 * context of the request, which the list and the detail share. The qualified name of an action is the namespace of
 * the service, taken from the name of its entity container, and the name of the action.
 *
 * Whether an action is available is not decided here: the view binds each button to the flag of the action in
 * __OperationControl, which the service calculates (docs/servicio.md, section 6). If an action that is not enabled is
 * invoked anyway, the service answers 422 and the promise is rejected.
 *
 * The service answers each action with the updated request. The model merges that response into the cache of the
 * request only for the properties that the list binding selected, so the properties that the detail requested later
 * (the dynamic control) are not refreshed by it. The side effects of the actions name the whole request as the
 * target (docs/servicio.md, section 11): the request is loaded again, which updates the detail, the buttons and the
 * row of the list at once.
 */
export default class ActionService {

    /** Name of the entity container in the metadata model, a string with the namespace of the service as prefix. */
    private static readonly ENTITY_CONTAINER = "/$EntityContainer";

    /** Navigation property path of the side effects that means the entity itself. */
    private static readonly WHOLE_ENTITY = { $NavigationPropertyPath: "" };

    private readonly model: ODataModel;

    /**
     * @param model The OData V4 model of the service
     */
    constructor(model: ODataModel) {
        this.model = model;
    }

    /**
     * A deferred operation binding for a business action, relative to the context of a request. Its parameter
     * context (ODataContextBinding#getParameterContext) is the binding context of the dialog that asks for the
     * parameters; the initial values are set with ODataContextBinding#setParameter. The caller destroys the binding
     * once it is no longer needed.
     * @param action The business action
     * @param requestContext Context of the active request: the binding parameter of the action
     * @param initialParameters Initial values of parameters, which the user can change in the dialog
     */
    public async bind(action: BusinessAction, requestContext: Context,
            initialParameters?: Record<string, string | number | boolean>): Promise<ODataContextBinding> {
        const actionName = await this.requestActionName(action);
        // the request of the action carries the $select of the list binding, so that the response updates the row
        const binding = this.model.bindContext(`${actionName}(...)`, requestContext, { $$inheritExpandSelect: true });
        for (const [name, value] of Object.entries(initialParameters ?? {})) {
            binding.setParameter(name, value);
        }
        return binding;
    }

    /**
     * Invokes a business action with the parameters of its binding. The promise is rejected if the service rejects the
     * action (the model reports the messages of the response); the binding stays valid, so that the action can be
     * invoked again with other parameters. Once the action has succeeded, reload loads the request again.
     * @param binding Operation binding created with bind
     */
    public async invoke(binding: ODataContextBinding): Promise<void> {
        await binding.invoke();
    }

    /**
     * Loads the request again after a business action, so that the detail (its fields and the dynamic control that
     * enables the buttons) and the row of the list show what the service has changed.
     * @param requestContext Context of the request, as given to bind
     */
    public async reload(requestContext: Context): Promise<void> {
        await requestContext.requestSideEffects([ActionService.WHOLE_ENTITY]);
    }

    /**
     * Invokes a business action without parameters (for example startWork) and loads the request again.
     * @param action The business action
     * @param requestContext Context of the active request
     */
    public async execute(action: BusinessAction, requestContext: Context): Promise<void> {
        const binding = await this.bind(action, requestContext);
        try {
            await this.invoke(binding);
        } finally {
            binding.destroy();
        }
        await this.reload(requestContext);
    }

    /**
     * Deletes an active request. The service rejects the deletion with 422 when it is not allowed, and with 423 when
     * the request has a draft. If the DELETE request fails, the model restores the context. The list removes the row.
     * @param requestContext Context of the active request
     */
    public async deleteRequest(requestContext: Context): Promise<void> {
        await requestContext.delete();
    }

    /**
     * The qualified name of a business action, for example com.sap.gateway.srvd.zui_mnt_request.v0001.assign.
     * @param action The business action
     */
    private async requestActionName(action: BusinessAction): Promise<string> {
        const container: unknown = await this.model.getMetaModel().requestObject(ActionService.ENTITY_CONTAINER);
        if (typeof container !== "string" || !container.includes(".")) {
            throw new Error(`The metadata contain no entity container: the action ${action} cannot be named`);
        }
        return `${container.slice(0, container.lastIndexOf("."))}.${action}`;
    }
}
