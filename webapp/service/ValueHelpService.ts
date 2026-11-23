import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { EquipmentProperty, ProductProperty, ValueHelpEntity } from "../model/constants";

/** The entity found for a code: its key and, for a material, its base unit. */
export type ValueHelpEntry = Partial<Record<ValueHelpEntity | ProductProperty, string>>;

/**
 * Support of the search helps of plant, equipment and material (HU-07). The dialogs read the entity sets Plants,
 * Equipments and Products with $search and progressive loading; this service finds the entity of a code typed
 * by the user, so that a code that does not exist can be told before it is sent to the draft.
 *
 * The metadata describe the search helps with Common.ValueListReferences, which refers to a metadata document of
 * each help that the service does not publish together with $metadata (docs/servicio.md, section 12). The
 * application therefore reads the entity sets of the service directly.
 */
export default class ValueHelpService {

    /** Entity set of each search help. */
    private static readonly ENTITY_SETS: Record<ValueHelpEntity, string> = {
        [ValueHelpEntity.Plant]: "/Plants",
        [ValueHelpEntity.Equipment]: "/Equipments",
        [ValueHelpEntity.Product]: "/Products"
    };

    /** Properties besides the key that the search of a code reads. */
    private static readonly EXTRA_PROPERTIES: Partial<Record<ValueHelpEntity, ProductProperty[]>> = {
        [ValueHelpEntity.Product]: [ProductProperty.BaseUnit]
    };

    /** Equipment codes are returned without leading zeros, for example 224100001. */
    private static readonly LEADING_ZEROS = /^0+(?=\d)/;

    public constructor(private readonly model: ODataModel) {
    }

    /**
     * The search text as a phrase of the $search parameter: between double quotes, with the double quotes and the
     * backslashes of the text escaped. In a phrase the service takes quotes, parentheses and the words AND, OR and
     * NOT as text, not as operators of the search expression.
     * @param query The text typed by the user
     */
    public static toSearchPhrase(query: string): string {
        return `"${query.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
    }

    /**
     * The code in the form that the service returns it: an equipment code without leading zeros.
     * @param entity The entity of the code
     * @param code The code typed by the user
     */
    public static normalizeCode(entity: ValueHelpEntity, code: string): string {
        const trimmed = code.trim();
        return entity === ValueHelpEntity.Equipment ? trimmed.replace(ValueHelpService.LEADING_ZEROS, "") : trimmed;
    }

    /**
     * Reads the entity with the given code in the service. A list binding is used, because the read of a key that
     * does not exist would be a 404 response that the model reports as an error.
     * @param entity The entity to look for
     * @param code The code, already normalized
     * @param plant For an equipment, the plant to which it has to belong
     * @returns The entity, or undefined when the service has none with that code
     */
    public async find(entity: ValueHelpEntity, code: string, plant?: string): Promise<ValueHelpEntry | undefined> {
        const filters = [new Filter(entity, FilterOperator.EQ, code)];
        if (entity === ValueHelpEntity.Equipment && plant) {
            filters.push(new Filter(EquipmentProperty.Plant, FilterOperator.EQ, plant));
        }
        const binding = this.model.bindList(ValueHelpService.ENTITY_SETS[entity], undefined, undefined,
            new Filter({ filters, and: true }), {
                $$ownRequest: true,
                $select: [entity, ...(ValueHelpService.EXTRA_PROPERTIES[entity] ?? [])]
            });
        try {
            const [context] = await binding.requestContexts(0, 1);
            return context ? await context.requestObject() as ValueHelpEntry : undefined;
        } finally {
            binding.destroy();
        }
    }
}
