/**
 * Helpers for working with Foundry v14 DataFieldOperators
 * (`ForcedDeletion` / `ForcedReplacement`, a.k.a. `_del` / `_replace()`)
 * inside custom fields which override `_cleanType` / `_updateDiff`.
 */

/**
 * Reconstruct a serialized DataFieldOperator value in place.
 * Update diffs received from the server contain operators in their serialized
 * form (`{"__$OPERATOR$__": "ForcedDeletion"}`). Core fields revive these while
 * cleaning, so custom fields which override `_cleanType` must do the same.
 *
 * @returns The (possibly reconstructed) value stored at `data[key]`
 */
export function reconstructOperator(
    data: Record<string, unknown>,
    key: string,
    value: unknown,
): unknown {
    (
        foundry.data.fields.SchemaField as unknown as {
            reconstructOperator?: (
                data: Record<string, unknown>,
                k: string,
                v: unknown,
            ) => void;
        }
    ).reconstructOperator?.(data, key, value);
    return key in data ? data[key] : undefined;
}

/**
 * Whether the given value is a DataFieldOperator instance.
 */
export function isDataFieldOperator(value: unknown): boolean {
    return value instanceof foundry.data.operators.DataFieldOperator;
}
