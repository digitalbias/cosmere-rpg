/**
 * Compatibility helpers for roll modes.
 *
 * Foundry v14 replaced the legacy roll modes (`publicroll`, `gmroll`,
 * `blindroll`, `selfroll`), the `core.rollMode` setting and `CONFIG.Dice.rollModes`
 * with chat message visibility modes (`public`, `gm`, `blind`, `self`), the
 * `core.messageMode` setting and `CONFIG.ChatMessage.modes`.
 *
 * The system still uses the legacy roll mode identifiers internally (they are
 * part of its roll configuration dialogs and hook payloads), so these helpers
 * translate between the two at the boundaries with Foundry's API.
 */
import type { RollMode } from '@system/dice/types';

const LEGACY_TO_MESSAGE_MODE: Record<string, string> = {
    publicroll: 'public',
    gmroll: 'gm',
    blindroll: 'blind',
    selfroll: 'self',
};

const MESSAGE_TO_LEGACY_MODE: Record<string, RollMode> = Object.fromEntries(
    Object.entries(LEGACY_TO_MESSAGE_MODE).map(([legacy, mode]) => [
        mode,
        legacy as RollMode,
    ]),
);

const LEGACY_ICONS: Record<string, string> = {
    publicroll: 'fa-solid fa-globe',
    gmroll: 'fa-solid fa-user-secret',
    blindroll: 'fa-solid fa-eye-slash',
    selfroll: 'fa-solid fa-user',
};

function hasMessageModes(): boolean {
    return game.settings.settings.has('core.messageMode');
}

/**
 * Get the user's currently selected roll mode as a legacy roll mode identifier.
 */
export function getDefaultRollMode(): RollMode {
    if (!hasMessageModes()) return game.settings.get('core', 'rollMode');

    const mode = (
        game.settings as unknown as { get(ns: string, key: string): string }
    ).get('core', 'messageMode');
    return MESSAGE_TO_LEGACY_MODE[mode] ?? 'publicroll';
}

/**
 * Convert a legacy roll mode into a v14 chat message visibility mode.
 */
export function toMessageMode(rollMode?: string | null): string | undefined {
    if (!rollMode) return undefined;
    if (rollMode === 'roll') return undefined; // Use the current setting
    return LEGACY_TO_MESSAGE_MODE[rollMode] ?? rollMode;
}

/**
 * Options to pass to `ChatMessage.create`/`Roll#toMessage` to apply a roll mode.
 */
export function messageModeOptions<T extends object = Record<string, string>>(
    rollMode?: string | null,
): T {
    if (!hasMessageModes()) return (rollMode ? { rollMode } : {}) as T;
    const messageMode = toMessageMode(rollMode);
    return (messageMode ? { messageMode } : {}) as T;
}

/**
 * Apply a roll mode to an (unsaved) chat message.
 */
export function applyRollModeToMessage(message: ChatMessage, rollMode: string) {
    const msg = message as unknown as {
        applyMode?: (mode: string) => void;
        applyRollMode: (mode: string) => void;
    };
    if (hasMessageModes() && msg.applyMode) {
        const mode = toMessageMode(rollMode);
        if (mode) msg.applyMode(mode);
    } else {
        msg.applyRollMode(rollMode);
    }
}

/**
 * The available roll modes keyed by their legacy identifier, for use in
 * roll configuration dialogs.
 */
export function getRollModeChoices(): Record<
    string,
    { label: string; icon: string }
> {
    const modes = (
        CONFIG.ChatMessage as unknown as {
            modes?: Record<string, { label: string; icon: string }>;
        }
    ).modes;
    if (!modes) return CONFIG.Dice.rollModes;

    return Object.fromEntries(
        Object.entries(LEGACY_TO_MESSAGE_MODE).map(([legacy, mode]) => [
            legacy,
            {
                label: modes[mode]?.label ?? legacy,
                icon: modes[mode]?.icon ?? LEGACY_ICONS[legacy],
            },
        ]),
    );
}
