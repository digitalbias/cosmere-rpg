# Foundry VTT v14 migration notes (`v14-compat` branch)

Personal-use branch to run the Cosmere RPG system (3.1.2) on Foundry VTT v14 (tested on build 14.370).

## Starting point

- Branched from `main` (3.1.2) and merged upstream's in-progress `the-metalworks/cosmere-rpg` branch
  `feat/fvtt-v14` (fvtt-types v14, the new v14 `ObjectField` `_cleanType` / `_updateDiff` APIs,
  system embedded collection schema, test fixes).
- Removed the private `@the-metalworks/docker-world-seed` dev dependency (it needs a GitHub
  Packages token and is only used for the dockerised test suite).
- `src/system.json` compatibility is set to `minimum: 14`, `verified: 14.370`, `maximum: 14`.

## Fixes made on top of upstream

| Area | Problem on v14 | Fix |
| --- | --- | --- |
| ActiveEffect data model | v14 requires every ActiveEffect type data model to define `changes` (logged an error at startup) | `ActiveEffectDataModel` includes the core `ActiveEffectTypeDataModel` schema |
| Effect application | v14 calls the static `ActiveEffect.applyChange` instead of the instance `apply`, so the system's roll-data formulas and **effect stacks** were silently ignored (a 2-stack effect only applied once) | Logic moved to `CosmereActiveEffect.applyChange` |
| Effect phases | `Actor#applyActiveEffects()` needs a phase; `CONFIG.ActiveEffect.legacyTransferral` was removed | Pass `'initial'`, drop the legacy check |
| `CONST.ACTIVE_EFFECT_MODES` | Deprecated | Local `CHANGE_MODES` for the item event system's numeric change modes (no data migration needed); labels use `EFFECT.CHANGES.TYPES.*` |
| Effect durations | v14 uses `duration.value` + `duration.units` | Duration helper, item effects list and allomancy macro updated |
| Removing data (`-=` keys) — upstream issue #972 | Custom `CollectionField`/`MappingField` didn't understand v14 `ForcedDeletion` (`_del`) and crashed in `_updateDiff`; serialized operators from server diffs were not revived. Removing expertises, talent tree nodes/prereqs/connections, item relationships and event rules failed | Fields now handle `DataFieldOperator`s (incl. legacy `-=`), reconstruct serialized operators, pass validation state and implement `_updateCommit`. All `-=` call sites switched to `ForcedDeletion` |
| Context menus — upstream issue #792 | `data-action="test"` on menu buttons collided with AppV2 action dispatch (Edit / Remove / Recharge did nothing) | Attribute removed; menu positioned absolutely |
| Roll modes | `core.rollMode`, `CONFIG.Dice.rollModes`, `rollMode` options deprecated in favour of message modes | `utils/roll-mode.ts` translates legacy roll modes to `messageMode` at Foundry API boundaries |
| Talent tree sheet | Selecting an actor in the header submitted the form and tried to update the (locked) compendium item; header select was squashed | Ignore header select / non-editable updates; header CSS |
| Token deltas | Socket layer warned about and skipped Token `delta` (a single embedded document) | Transform single embedded documents |
| Misc deprecations | `KeyboardManager`, `Actors`/`Items` globals, `TableResult#text`, tooltip `content` option | Namespaced / replaced |
| Robustness | Combat failed data preparation when a combatant's actor was deleted; `CosmereItem#use` returned serialized roll strings instead of `Roll`s | Null-safe combatant getters; pass a copy of rolls to `ChatMessage.create` |

## How it was verified

Ran Foundry 14.370 headless against a scratch data directory (copies of the Stormlight Handbook
and Chasmfiend modules and of the local `cosmere` world) and drove it with Playwright:

- All system and Stormlight Handbook / Chasmfiend compendium documents load with no invalid documents.
- Character creation (ancestry, culture, heroic & radiant paths, talent grants via the event
  system), all character sheet tabs, item sheets of every type, adversary sheets, journals.
- Skill tests and attacks (fast-forward and through the roll dialogs), chat cards, damage
  application to unlinked tokens (deflect respected), conditions, stacking effects, formula
  effects, effect config sheet, expertise add/remove, rests, injuries, combat tracker, token HUD,
  talent tree picking, player (non-GM) ownership flows.
- The old v13 world migrates (core + system migration) and opens.
- Upstream Playwright suite: 7/11 pass; the 4 failures need the "Stormlight Starter Rules"
  compendium folder from the docker world seed, which isn't available locally.
- No deprecation warnings or errors are logged during any of the above.

## Type checking and linting

- TypeScript upgraded to 6.x (the version fvtt-types v14 is built against), `@types/node` to 24 and
  `lib` to `esnext`; `typescript-eslint` updated to a release that supports TS 6.
- `tsc --noEmit` and `eslint src` both pass with zero errors, so the pre-commit hook works again.
- Type fixes that also changed runtime behaviour:
  - `foundry.utils.parseUuid` can return `null` in v14; callers now handle it.
  - `Game.connect` takes no arguments in v14; the system embedded collection socket patch forwards
    whatever it receives.
  - Item embeds (`@Embed`) are wrapped in a `<document-embed>` element so core attaches the uuid
    and calls `onEmbed`.
  - Combat tracker context menu uses v14 `label`/`onClick`, and hides core's initiative
    Reroll / Clear entries again (the filter matched the v13 labels and silently stopped working).
  - `modifyTokenAttribute` hook receives the actor as its third argument, as in core.
- `prefer-nullish-coalescing` is configured to ignore primitives and ternaries so `||` fallbacks for
  empty strings keep their behaviour.

## Known remaining work

- Things not exercised: Mistborn content, Dice So Nice integration, multi-level scenes (v14 Scene
  Levels), regions.
- Switch back to the official release once upstream ships v14 support.

## Building / installing

```sh
npm install
npm run build && npm run pack   # outputs to ./build
```

Then copy (or `npm run link`) `build/` into your Foundry data `systems/cosmere-rpg` folder.
Back up your worlds first; Foundry's v14 migration can't be reversed.
