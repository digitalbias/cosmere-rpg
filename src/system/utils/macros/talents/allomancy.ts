import { ValueOf } from '@league-of-foundry-developers/foundry-vtt-types/utils';
import { CosmereActiveEffect, CosmereActor } from '@src/system/documents';
import { Event } from '@src/system/types/item/event-system';

interface ConsumeResponse {
    value?: {
        actual?: number;
    };
}

type metals = ValueOf<typeof metals>;

const metals = {
    Aluminum: 'aluminum',
    Atium: 'atium',
    Bendalloy: 'bendalloy',
    Brass: 'brass',
    Bronze: 'bronze',
    Cadmium: 'cadmium',
    Copper: 'copper',
    Electrum: 'electrum',
    Gold: 'gold',
    Iron: 'iron',
    Pewter: 'pewter',
    Tin: 'tin',
    Steel: 'steel',
    Zinc: 'zinc',
} as const;

interface MetalConfigData {
    duration?: (actor: CosmereActor) => number;
    changeValuesOnIncrease?: boolean;
    increase?: (data: unknown) => number;
}
type MetalConfig = Partial<Record<metals, MetalConfigData>>;

const metalsConfig: MetalConfig = {
    [metals.Atium]: { duration: (actor) => actor.system.skills.all.rank },
    [metals.Bronze]: { duration: (actor) => actor.system.skills.all.rank },
    [metals.Copper]: { duration: (actor) => actor.system.skills.all.rank },
    [metals.Gold]: { duration: () => 99 },
    [metals.Pewter]: {
        changeValuesOnIncrease: true,
        increase: (data: unknown) => Math.ceil((data as number) / 2),
    },
    [metals.Tin]: {
        changeValuesOnIncrease: true,
        increase: (data: unknown) => Math.ceil((data as number) / 2),
    },
};

export async function enableBurnEffect(
    metal: string,
    event: Event,
    actor: CosmereActor,
) {
    const consumeResponse =
        (event.options?.consumeResponse as ConsumeResponse[]) ?? [];
    const resourceUsed = consumeResponse[0]?.value?.actual ?? 0;
    const eff = event.item.transferredEffects[0];
    const duration = 1;
    let newEffData;
    if (Object.keys(metalsConfig).includes(metal)) {
        const config = metalsConfig[metal as metals]!;
        newEffData = getEffectUpdateData(
            eff,
            config.duration ? config.duration(actor) : duration,
            config.changeValuesOnIncrease,
            config.increase ? config.increase(resourceUsed) : undefined,
        );
    } else {
        newEffData = getEffectUpdateData(eff, duration);
    }
    console.log('Updating effect with new data:');
    console.log(newEffData);
    await eff.update(newEffData as never);
}

function getEffectUpdateData(
    eff: CosmereActiveEffect,
    duration: number,
    increaseChangesValues?: boolean,
    increaseValue?: number,
) {
    // NOTE: Since Foundry v14 changes live in the effect's system data and
    // durations are defined by a value and units.
    const changes = foundry.utils.deepClone(
        (eff.system as unknown as { changes: { value: unknown }[] }).changes,
    );
    if (increaseChangesValues && increaseValue) {
        for (const change of changes) {
            change.value = increaseValue.toString();
        }
    }
    const newEffData = {
        'system.changes': changes,
        duration: { value: duration, units: 'rounds' },
        disabled: false,
    };
    return newEffData;
}
