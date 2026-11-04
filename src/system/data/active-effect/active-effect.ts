import { DataSchema } from '../types';

const SCHEMA = () => ({
    isStackable: new foundry.data.fields.BooleanField({
        required: true,
        initial: false,
    }),
    stacks: new foundry.data.fields.NumberField({
        required: false,
        nullable: true,
        min: 0,
    }),
});

export type ActiveEffectDataSchema = DataSchema<typeof SCHEMA>;

export class ActiveEffectDataModel extends foundry.abstract.TypeDataModel<
    ActiveEffectDataSchema,
    ActiveEffect
> {
    static defineSchema() {
        // NOTE: Foundry v14 moved ActiveEffect changes into the type data model
        // (`system.changes`) and requires every ActiveEffect data model to define
        // them, so include the core ActiveEffectTypeDataModel schema.
        const coreSchema = (
            foundry.data as unknown as {
                ActiveEffectTypeDataModel?: {
                    defineSchema(): Record<string, unknown>;
                };
            }
        ).ActiveEffectTypeDataModel?.defineSchema();

        return {
            ...coreSchema,
            ...SCHEMA(),
        } as ActiveEffectDataSchema;
    }
}
