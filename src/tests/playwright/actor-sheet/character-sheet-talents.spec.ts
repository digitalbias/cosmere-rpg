import { Locator, Page } from '@playwright/test';
import { ActorType, ItemType } from '@src/system/types/cosmere';
import { test, expect } from '../fixtures';
import { ActorSheetRef } from '../helpers/actor';

// These tests build their own items so they don't depend on any compendium content.
const ANCESTRY_ID = 'test-ancestry';
const PATH_ID = 'test-path';
const POWER_ID = 'test-power';

interface OwnedItem {
    id: string;
    uuid: string;
    type: string;
    parents: string[];
}

async function addItems(
    page: Page,
    actor: ActorSheetRef,
    items: ({ name: string } & Record<string, unknown>)[],
) {
    return await page.evaluate(
        async ({ actorId, items }) => {
            const created = await game.actors
                .get(actorId)!
                .createEmbeddedDocuments('Item', items as never);
            // Foundry doesn't guarantee that created documents come back in request order
            return items.map(({ name }) => {
                const item = created.find((doc) => doc.name === name)!;
                return { id: item.id, uuid: item.uuid };
            });
        },
        { actorId: actor.id, items },
    );
}

/** Gives `talentId` a parent relationship to `parentId`, making it a child of that item. */
async function addParentRelationship(
    page: Page,
    actor: ActorSheetRef,
    talentId: string,
    parentId: string,
) {
    await page.evaluate(
        async ({ actorId, talentId, parentId }) => {
            const items = game.actors.get(actorId)!.items;
            await items
                .get(talentId)!
                .addRelationship(items.get(parentId)!, 'parent' as never);
        },
        { actorId: actor.id, talentId, parentId },
    );
}

async function getOwnedItems(page: Page, actor: ActorSheetRef) {
    return await page.evaluate((actorId) => {
        return game.actors.get(actorId)!.items.map((item) => ({
            id: item.id,
            uuid: item.uuid,
            type: item.type,
            parents: item.hasRelationships()
                ? item.system.relationships
                      .filter((rel) => (rel.type as string) === 'parent')
                      .map((rel) => rel.uuid)
                : [],
        }));
    }, actor.id);
}

async function openTalentsTab(actor: ActorSheetRef) {
    await actor.locator.locator('a[data-tab="talents"]').click();
}

function section(actor: ActorSheetRef, sectionId: string) {
    return actor.locator.locator(
        `app-character-talents-list ul.item-list[data-section-id="${sectionId}"]`,
    );
}

function sectionHeader(sectionLocator: Locator) {
    return sectionLocator.locator('li.item.header');
}

function openTreeButton(scope: Locator) {
    return scope.locator('a[data-action="open-talent-tree"]');
}

function newItemButton(scope: Locator) {
    return scope.locator('a[data-action="new-item"]');
}

/**
 * Clicks the section's "+" button and returns the single item it created.
 */
async function createFromSection(
    page: Page,
    actor: ActorSheetRef,
    sectionId: string,
) {
    const before = (await getOwnedItems(page, actor)).map((item) => item.id);
    await newItemButton(sectionHeader(section(actor, sectionId))).click();

    await expect
        .poll(async () => (await getOwnedItems(page, actor)).length)
        .toBe(before.length + 1);

    // The relationship is added in a second update after the item is created.
    let created: OwnedItem | undefined;
    await expect
        .poll(async () => {
            created = (await getOwnedItems(page, actor)).find(
                (item) => !before.includes(item.id),
            );
            return created?.parents.length;
        })
        .toBe(1);
    return created!;
}

async function expectTalentsTabOpen(page: Page, itemUuid: string) {
    // Matched by suffix because the id prefix differs per sheet class
    const itemSheet = page.locator(
        `[id$="Sheet-${itemUuid.replaceAll('.', '-')}"]`,
    );
    await expect(itemSheet).toBeVisible();
    await expect(itemSheet.locator('a[data-tab="talents"]')).toHaveClass(
        /active/,
    );
}

/**
 * Adds a talent provider with one child talent. Sections with no items are hidden
 * outside of edit mode, so the child is what makes the section appear.
 */
async function addProviderWithChild(
    page: Page,
    actor: ActorSheetRef,
    type: ItemType,
    sectionId: string,
    talentTree?: string,
) {
    const [provider, child] = await addItems(page, actor, [
        {
            type,
            name: `Test ${type}`,
            system: { id: sectionId, talentTree },
        },
        { type: ItemType.Talent, name: 'Child Talent' },
    ]);
    await addParentRelationship(page, actor, child.id, provider.id);
    await openTalentsTab(actor);
    await expect(section(actor, sectionId)).toHaveCount(1);
    return provider;
}

const PROVIDER_SECTIONS = [
    { label: 'Ancestry', type: ItemType.Ancestry, sectionId: ANCESTRY_ID },
    { label: 'Path', type: ItemType.Path, sectionId: PATH_ID },
    { label: 'Power', type: ItemType.Power, sectionId: POWER_ID },
];

test.describe('Talents list "+" buttons', () => {
    for (const { label, type, sectionId } of PROVIDER_SECTIONS) {
        test(`${label} section creates a talent linked to it`, async ({
            authenticatedPage: page,
            createActor,
        }) => {
            const actor = await createActor(
                'Test Character',
                ActorType.Character,
            );
            const provider = await addProviderWithChild(
                page,
                actor,
                type,
                sectionId,
            );

            const created = await createFromSection(page, actor, sectionId);

            expect(created.type).toBe(ItemType.Talent);
            expect(created.parents).toEqual([provider.uuid]);
            await expect(
                section(actor, sectionId).locator(
                    `li.item[data-item-id="${created.id}"]`,
                ),
            ).toHaveCount(1);
        });
    }
});

test.describe('Open talent tree button', () => {
    for (const { label, type, sectionId } of PROVIDER_SECTIONS) {
        test(`opens the talents tab from the ${label} section header`, async ({
            authenticatedPage: page,
            createActor,
            createItem,
        }) => {
            const tree = await createItem('Test Tree', ItemType.TalentTree);
            const actor = await createActor(
                'Test Character',
                ActorType.Character,
            );
            const provider = await addProviderWithChild(
                page,
                actor,
                type,
                sectionId,
                tree.uuid,
            );

            await openTreeButton(
                sectionHeader(section(actor, sectionId)),
            ).click();

            await expectTalentsTabOpen(page, provider.uuid);
        });
    }

    test('opens the talents tab from a power row and is absent on talent rows', async ({
        authenticatedPage: page,
        createActor,
        createItem,
    }) => {
        const tree = await createItem('Test Tree', ItemType.TalentTree);
        const actor = await createActor('Test Character', ActorType.Character);
        const [path, power, talent] = await addItems(page, actor, [
            {
                type: ItemType.Path,
                name: 'Test Path',
                system: { id: PATH_ID },
            },
            {
                type: ItemType.Power,
                name: 'Test Power',
                system: { id: POWER_ID, talentTree: tree.uuid },
            },
            { type: ItemType.Talent, name: 'Plain Talent' },
        ]);
        await addParentRelationship(page, actor, talent.id, path.id);
        await openTalentsTab(actor);

        const talentRow = actor.locator.locator(
            `li.item[data-item-id="${talent.id}"]`,
        );
        await expect(talentRow).toHaveCount(1);
        await expect(openTreeButton(talentRow)).toHaveCount(0);

        const powerRow = actor.locator.locator(
            `li.item[data-item-id="${power.id}"]`,
        );
        await powerRow.hover();
        await openTreeButton(powerRow).click();

        await expectTalentsTabOpen(page, power.uuid);
    });

    test('is absent when the item has no talent tree', async ({
        authenticatedPage: page,
        createActor,
    }) => {
        const actor = await createActor('Test Character', ActorType.Character);
        await addProviderWithChild(page, actor, ItemType.Path, PATH_ID);

        const header = sectionHeader(section(actor, PATH_ID));
        await expect(newItemButton(header)).toHaveCount(1);
        await expect(openTreeButton(header)).toHaveCount(0);
    });

    test('does not collapse the section when clicked', async ({
        authenticatedPage: page,
        createActor,
        createItem,
    }) => {
        const tree = await createItem('Test Tree', ItemType.TalentTree);
        const actor = await createActor('Test Character', ActorType.Character);
        const path = await addProviderWithChild(
            page,
            actor,
            ItemType.Path,
            PATH_ID,
            tree.uuid,
        );

        const pathSection = section(actor, PATH_ID);
        await expect(pathSection).toHaveClass(/expanded/);

        await openTreeButton(sectionHeader(pathSection)).click();
        await expectTalentsTabOpen(page, path.uuid);

        await expect(pathSection).toHaveClass(/expanded/);
    });

    test('header controls sit side by side without overlapping', async ({
        authenticatedPage: page,
        createActor,
        createItem,
    }) => {
        const tree = await createItem('Test Tree', ItemType.TalentTree);
        const actor = await createActor('Test Character', ActorType.Character);
        await addProviderWithChild(
            page,
            actor,
            ItemType.Path,
            PATH_ID,
            tree.uuid,
        );

        const header = sectionHeader(section(actor, PATH_ID));
        const treeBox = (await openTreeButton(header).boundingBox())!;
        const newBox = (await newItemButton(header).boundingBox())!;

        // Same row
        expect(Math.abs(treeBox.y - newBox.y)).toBeLessThan(treeBox.height / 2);
        // Tree button first, with no overlap
        expect(treeBox.x + treeBox.width).toBeLessThanOrEqual(newBox.x);
    });
});
