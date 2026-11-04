import {
    InferAssignmentType,
    InferInitializedType,
    InferPersistedType,
} from '../types';
import { AnyObject, AnyMutableObject } from '@system/types/utils';
import { reconstructOperator } from './operators';

export interface CollectionFieldOptions<T = AnyObject>
    extends foundry.data.fields.DataField.Options<AnyObject> {
    /**
     * The field to draw the item key from.
     * Alternatively, you can use a function to generate the key.
     *
     * @default "id"
     */
    key?: T extends AnyObject
        ? keyof T | ((item: Partial<T>) => string | null)
        : never;
}

export type CollectionFieldInitializedType<T> = RecordCollection<T> &
    Record<string, T>;

export type CollectionFieldSchema<
    ElementField extends foundry.data.fields.DataField.Any,
> = Record<string, ElementField>;

/**
 * A collection that is backed by a record object instead of a Map.
 * This allows us to persit it properly and update items easily,
 * while still having the convenience of a collection.
 */
export class RecordCollection<T> implements Collection<T> {
    declare ' __fvtt_types_internal_value': T;
    /**
     * NOTE: Must use `any` here as we need the RecordCollection
     * to be backing record object itself. This ensures its stored
     * properly.
     */
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
    constructor(entries?: [string, T][]) {
        if (entries) {
            entries.forEach(([key, value]) => {
                (this as any)[key] = value;
            });
        }
    }

    get contents(): T[] {
        return Object.entries(this).map(([key, value]) =>
            'id' in value ? value : { ...value, _id: key },
        );
    }

    public find<S extends T>(
        condition: (e: T, index: number, collection: this) => e is S,
    ): S | undefined;
    public find(
        condition: (e: T, index: number, collection: this) => boolean,
    ): T | undefined;
    public find(
        condition: (e: T, index: number, collection: this) => boolean,
    ): T | undefined {
        return Object.entries(this).find(([key, value], index) =>
            condition(
                'id' in value ? value : { ...value, _id: key },
                index,
                this,
            ),
        )?.[1];
    }

    public filter<S extends T>(
        condition: (e: T, index: number, collection: this) => e is S,
    ): S[];
    public filter(
        condition: (e: T, index: number, collection: this) => boolean,
    ): T[];
    public filter(
        condition: (e: T, index: number, collection: this) => boolean,
    ): T[] {
        return Object.entries(this)
            .filter(([key, value], index) =>
                condition(
                    'id' in value ? value : { ...value, _id: key },
                    index,
                    this,
                ),
            )
            .map(([key, value]) => value);
    }

    public has(key: string): boolean {
        return key in this;
    }

    public get(key: string, options: { strict: true }): T;
    public get(key: string, options?: { strict: false }): T | undefined;
    public get(
        key: string,
        options: { strict: boolean } = { strict: false },
    ): T | undefined {
        if (!this.has(key)) {
            if (options.strict) throw new Error(`key ${key} not found`);
            return undefined;
        }
        return (this as any)[key];
    }

    public getName(name: string, options: { strict: true }): T;
    public getName(name: string, options?: { strict: false }): T | undefined;
    public getName(
        name: string,
        options: { strict: boolean } = { strict: false },
    ): T | undefined {
        const record = this.contents.find(
            (value) =>
                value &&
                typeof value === 'object' &&
                'name' in value &&
                value.name === name,
        );
        if (!record) {
            if (options.strict) throw new Error(`name ${name} not found`);
            return undefined;
        }
        return record;
    }

    public map<M>(
        transformer: (entity: T, index: number, collection: this) => M,
    ): M[] {
        return Object.entries(this).map(([key, value], index) =>
            transformer(
                'id' in value ? value : { ...value, _id: key },
                index,
                this,
            ),
        );
    }

    public reduce<A>(
        evaluator: (
            accumulator: A,
            value: T,
            index: number,
            collection: this,
        ) => A,
        initialValue: A,
    ): A {
        return Object.entries(this).reduce(
            (accumulator, [key, value], index) =>
                evaluator(
                    accumulator,
                    'id' in value ? value : { ...value, _id: key },
                    index,
                    this,
                ),
            initialValue,
        );
    }

    public some(
        condition: (value: T, index: number, collection: this) => boolean,
    ): boolean {
        return Object.entries(this).some(([key, value], index) =>
            condition(
                'id' in value ? value : { ...value, _id: key },
                index,
                this,
            ),
        );
    }

    public every(
        condition: (value: T, index: number, collection: this) => boolean,
    ): boolean {
        return Object.entries(this).every(([key, value], index) =>
            condition(
                'id' in value ? value : { ...value, _id: key },
                index,
                this,
            ),
        );
    }

    public set(key: string, value: T): this {
        (this as any)[key] = value;
        return this;
    }

    public getOrInsert(key: string, defaultValue: T): T {
        if (!this.has(key)) this.set(key, defaultValue);
        return this.get(key, { strict: true });
    }

    public getOrInsertComputed(key: string, callback: (key: string) => T): T {
        if (!this.has(key)) this.set(key, callback(key));
        return this.get(key, { strict: true });
    }

    public delete(key: string): boolean {
        if (!this.has(key)) return false;
        delete (this as any)[key];
        return true;
    }

    public clear(): void {
        Object.keys(this).forEach((key) => delete (this as any)[key]);
    }

    public get size(): number {
        return Object.keys(this).length;
    }

    public entries(): MapIterator<[string, T]> {
        return Object.entries(this) as unknown as MapIterator<[string, T]>;
    }

    public keys(): MapIterator<string> {
        return Object.keys(this)[Symbol.iterator]();
    }

    public values(): MapIterator<T> {
        return Object.entries(this)
            .map(([key, value]) =>
                'id' in value ? value : { ...value, _id: key },
            )
            [Symbol.iterator]();
    }

    public forEach(
        callbackfn: (value: T, index: number) => void,
        thisArg?: any,
    ): void {
        Array.from(this.values()).forEach(callbackfn);
    }

    public forEachEntry(
        callbackfn: (value: T, key: string, map: this) => void,
        thisArg?: any,
    ): void {
        Object.entries(this).forEach(([key, value]) =>
            callbackfn.call(thisArg, value, key, this),
        );
    }

    [Symbol.iterator](): MapIterator<T> {
        return this.values();
    }

    // NOTE: This is implicitly readonly as we don't have a way to set it.
    // eslint-disable-next-line @typescript-eslint/class-literal-property-style
    get [Symbol.toStringTag]() {
        return 'RecordCollection';
    }

    public toJSON() {
        return Array.from(this.entries()).reduce((acc, [key, value]) => {
            if (value && typeof value === 'object' && 'toJSON' in value) {
                value = (value as { toJSON: () => T }).toJSON();
            }
            return { ...acc, [key]: value };
        }, {} as any);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
}

export class CollectionField<
    ElementField extends foundry.data.fields.DataField.Any,
    TElementFieldAssignment = InferAssignmentType<ElementField>,
    TElementFieldInitialized = InferInitializedType<ElementField>,
    TElementFieldPersisted = InferPersistedType<ElementField>,
    TAssignment = Record<string, TElementFieldAssignment> | null | undefined,
    TInitialized extends
        CollectionFieldInitializedType<TElementFieldInitialized> = CollectionFieldInitializedType<TElementFieldInitialized>,
    TPersisted extends AnyObject = Record<string, TElementFieldPersisted>,
    TOptions extends
        CollectionFieldOptions<TElementFieldAssignment> = CollectionFieldOptions<TElementFieldAssignment>,
> extends foundry.data.fields.ObjectField<
    TOptions,
    TAssignment,
    TInitialized,
    TPersisted
> {
    constructor(
        public readonly model: ElementField,
        options: TOptions = {} as TOptions,
        context?: foundry.data.fields.DataField.ConstructionContext,
        private CollectionClass: typeof RecordCollection<TElementFieldAssignment> = RecordCollection<TElementFieldAssignment>,
    ) {
        super(options, context);
    }

    protected override _cleanType(
        value: TInitialized,
        options?: object,
        _state: foundry.data.fields.DataField.UpdateState = {},
    ) {
        const source =
            _state.source && typeof _state.source === 'object'
                ? (_state.source as Record<string, unknown>)
                : undefined;
        Array.from(Object.entries(value)).forEach(([key, v]) => {
            // Reconstruct serialized DataFieldOperators (e.g. ForcedDeletion
            // received from the server as part of an update diff)
            v = reconstructOperator(value, key, v) as typeof v;

            // Leave deletion/replacement operators untouched
            if (
                key.startsWith('-=') ||
                v instanceof foundry.data.operators.DataFieldOperator
            )
                return;

            const cleaned = this.model.clean(v, options, {
                ..._state,
                source: source?.[key],
            }) as TElementFieldAssignment;

            // Determine the key
            const prevKey = key;
            key = this.getItemKey(cleaned) ?? key;

            if (key !== prevKey) delete value[prevKey];

            (value as Record<string, TElementFieldAssignment>)[key] = cleaned;
        });

        return value;
    }

    protected override _validateType(
        value: unknown,
        options?: foundry.data.fields.DataField.ValidateOptions<this>,
    ): boolean | foundry.data.validation.DataModelValidationFailure | void {
        if (!value || typeof value !== 'object')
            throw new Error('must be a RecordCollection object');

        const errors = this._validateValues(
            value as Record<string, unknown>,
            options as unknown as foundry.data.fields.DataField.ValidateOptions<
                typeof this.model
            >,
        );
        if (!foundry.utils.isEmpty(errors)) {
            // Create validatior failure
            const failure =
                new foundry.data.validation.DataModelValidationFailure();

            // Set fields
            failure.fields = errors;

            // Throw error
            throw new foundry.data.validation.DataModelValidationError(failure);
        }
    }

    protected _validateValues(
        value: Record<string, unknown>,
        options?: foundry.data.fields.DataField.ValidateOptions<
            typeof this.model
        >,
    ) {
        const errors: Record<
            string,
            foundry.data.validation.DataModelValidationFailure
        > = {};
        Object.entries(value).forEach(([id, v]) => {
            if (id.startsWith('-=') && v === null) return; // Skip deletions
            if (v instanceof foundry.data.operators.DataFieldOperator) return;

            const error = this.model.validate(
                v,
                options,
            ) as foundry.data.validation.DataModelValidationFailure | null;
            if (error?.unresolved) {
                errors[id] = error;
            }
        });

        return errors;
    }

    protected override _cast(value: unknown) {
        // Get entries
        const entries =
            value instanceof this.CollectionClass
                ? Array.from<[string, unknown]>(value.entries())
                : foundry.utils.getType(value) === 'Map'
                  ? Array.from((value as Map<string, unknown>).entries())
                  : foundry.utils.getType(value) === 'Object'
                    ? (Object.entries(value as object) as [string, unknown][])
                    : foundry.utils.getType(value) === 'Array'
                      ? (
                            value as ({
                                _id?: string;
                                id?: string;
                            } & TElementFieldAssignment)[]
                        ).map(
                            (v, i) =>
                                [this.getItemKey(v) ?? i, v] as [
                                    string,
                                    unknown,
                                ],
                        )
                      : [];

        // Reduce entries to Record<string, unknown>
        const result = entries.reduce(
            (acc, [key, value]) => ({
                ...acc,
                [key]: value,
            }),
            {},
        ) as TAssignment;

        return result;
    }

    public _updateDiff(
        key: string,
        value: Record<string, unknown> | null | undefined,
        options: foundry.abstract.DataModel.UpdateOptions,
        state: {
            source: AnyMutableObject;
            diff: AnyMutableObject;
            model?: foundry.abstract.DataModel.Any;
            failure?: foundry.data.validation.DataModelValidationFailure;
        },
    ) {
        const { DataFieldOperator, ForcedDeletion, ForcedReplacement } =
            foundry.data.operators;

        // * -> null, or operators applied to the whole collection (e.g. _del, _replace())
        if (!value || value instanceof DataFieldOperator)
            return super._updateDiff(key, value as never, options, state);

        // * -> {}
        const source = ((state.source[key] as
            | Record<string, unknown>
            | undefined) ??= {});
        const diff: AnyMutableObject = {};
        const failure =
            new foundry.data.validation.DataModelValidationFailure();
        const fieldState = { ...state, source, diff, failure };

        Object.entries(value).forEach(([k, v]) => {
            let name = k;
            let update = v;

            // Backwards compatibility for legacy special keys
            if (k.startsWith('-=')) {
                name = k.slice(2);
                update = new ForcedDeletion();
            } else if (k.startsWith('==')) {
                name = k.slice(2);
                update = ForcedReplacement.create(v as AnyObject);
            }

            // Deletions are kept in the diff, but removed from source
            if (update instanceof ForcedDeletion) {
                if (name in source) {
                    diff[name] = update;
                    delete source[name];
                }
                return;
            }

            (
                this.model as unknown as {
                    _updateDiff: (
                        k: string,
                        v: unknown,
                        o: typeof options,
                        s: typeof fieldState,
                    ) => void;
                }
            )._updateDiff(name, update, options, fieldState);
        });

        // Record failure
        if (failure.unresolved) {
            if (state.failure) {
                (state.failure.fields as Record<string, unknown>)[key] =
                    failure;
                state.failure.unresolved = true;
            }
            return;
        }

        if (foundry.utils.isEmpty(diff)) return;

        // Assign results to diff and source
        state.diff[key] = diff;
        state.source[key] = source;
    }

    public override _updateCommit(
        source: AnyMutableObject,
        key: string,
        value: unknown,
        diff: unknown,
        options: foundry.abstract.DataModel.UpdateOptions,
    ) {
        const s = source[key] as AnyMutableObject | undefined;

        // * -> undefined, * -> null, undefined -> *, null -> *
        if (!s || !value || Object.isSealed(s)) {
            source[key] = value;
            return;
        }

        const v = value as AnyMutableObject;

        // Remove keys which no longer exist in the new value
        Object.keys(s).forEach((k) => {
            if (!(k in v)) delete s[k];
        });

        // Update entries which changed in the diff
        Object.entries((diff as AnyMutableObject) ?? {}).forEach(([k, d]) => {
            if (d instanceof foundry.data.operators.ForcedDeletion) return;
            (
                this.model as unknown as {
                    _updateCommit: (
                        s: AnyMutableObject,
                        k: string,
                        v: unknown,
                        d: unknown,
                        o: typeof options,
                    ) => void;
                }
            )._updateCommit(s, k, v[k], d, options);
        });
    }

    public override getInitialValue() {
        return new this.CollectionClass() as unknown as TInitialized;
    }

    public override initialize(
        value: TPersisted,
        model: foundry.abstract.DataModel.Any,
        options?: foundry.data.fields.DataField.InitializeOptions,
    ) {
        if (!value)
            return new this.CollectionClass() as unknown as TInitialized;
        value = foundry.utils.deepClone(value);
        const collection = new this.CollectionClass(
            Object.entries(value) as [string, TElementFieldAssignment][],
        );

        Array.from(collection.entries()).forEach(([id, v]) => {
            const initialized = this.model.initialize(v, model, options) as
                | TElementFieldAssignment
                | (() => TElementFieldAssignment | null);
            const set =
                typeof initialized === 'function'
                    ? (initialized as () => TElementFieldAssignment | null)()
                    : initialized;
            if (set) collection.set(id, set);
        });

        return collection as unknown as TInitialized;
    }

    public override toObject(value: TInitialized) {
        const result = Array.from(value.entries()).reduce(
            (acc, [id, v]) => ({
                ...acc,
                [id]: this.model.toObject(v),
            }),
            {},
        );
        return result as TPersisted;
    }

    public override _getField(
        path: string[],
    ): foundry.data.fields.DataField.Any | undefined {
        if (path.length === 0) return this;
        else if (path.length === 1) return this.model;

        path.shift();
        return (
            this.model as unknown as {
                _getField: (
                    path: string[],
                ) => foundry.data.fields.DataField.Any | undefined;
            }
        )._getField(path);
    }

    private getItemKey(
        item: TElementFieldAssignment,
    ): string | null | undefined {
        if (typeof this.options.key === 'function')
            return this.options.key(item);
        if (!item || typeof item !== 'object') return undefined;

        const keyField = this.options.key as
            | keyof TElementFieldAssignment
            | undefined;

        const val = keyField
            ? item[keyField]
            : 'id' in item
              ? item.id
              : '_id' in item
                ? item._id
                : undefined;

        return typeof val === 'string' ? val : undefined;
    }
}
