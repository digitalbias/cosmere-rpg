import { DataSchema } from '../../types';

/**
 * Numeric change modes used by the item event system's change data.
 * These mirror the legacy `CONST.ACTIVE_EFFECT_MODES` values, which were
 * deprecated in Foundry v14 in favor of string change types. They are kept
 * numeric here so that existing item data does not need to be migrated.
 */
export const CHANGE_MODES = Object.freeze({
    CUSTOM: 0,
    MULTIPLY: 1,
    ADD: 2,
    DOWNGRADE: 3,
    UPGRADE: 4,
    OVERRIDE: 5,
} as const);

export type ChangeMode = (typeof CHANGE_MODES)[keyof typeof CHANGE_MODES];

const SCHEMA = () => ({
    key: new foundry.data.fields.StringField({
        required: true,
        blank: true,
        initial: '',
    }),
    value: new foundry.data.fields.StringField({
        required: true,
        blank: true,
        initial: '',
    }),
    mode: new foundry.data.fields.NumberField({
        required: true,
        nullable: false,
        initial: CHANGE_MODES.OVERRIDE,
        choices: Object.entries(CHANGE_MODES).reduce(
            (acc, [key, value]) => ({
                ...acc,
                [value]: `EFFECT.CHANGES.TYPES.${key.toLowerCase()}`,
            }),
            {},
        ),
    }),
});

export type ChangeDataSchema = DataSchema<typeof SCHEMA>;
export type ChangeData =
    foundry.data.fields.SchemaField.InitializedData<ChangeDataSchema>;

export class ChangeDataModel extends foundry.abstract
    .DataModel<ChangeDataSchema> {
    static defineSchema() {
        return SCHEMA();
    }
}
