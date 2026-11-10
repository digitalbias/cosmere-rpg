import { Page } from '@playwright/test';
import { test as base, expect } from '../fixtures';

/**
 * Wraps a heading in the anchor sections that the @Link block hook turns into a
 * pseudo-embed, which is where the heading's text gets rebuilt.
 */
function linkBlock(headingHtml: string) {
    return [
        '<section data-link class="content-link-anchor"></section>',
        `<h3>${headingHtml}</h3>`,
        '<p>Body text</p>',
        '<section class="content-link-anchor"></section>',
    ].join('');
}

const test = base.extend<{
    openJournal: (content: string) => Promise<void>;
}>({
    openJournal: async ({ authenticatedPage: page }, use) => {
        const createdIds: string[] = [];

        await use(async (content: string) => {
            const id = await createAndRenderJournal(page, content);
            createdIds.push(id);
        });

        for (const id of createdIds) {
            await page.evaluate(async (id) => {
                await game.journal.get(id)?.delete();
            }, id);
        }
    },
});

async function createAndRenderJournal(page: Page, content: string) {
    return await page.evaluate(async (content) => {
        const entry = (await JournalEntry.create({
            name: 'Test Journal',
            pages: [
                {
                    name: 'Test Page',
                    type: 'text',
                    text: { content, format: 1 },
                },
            ],
        } as never)) as unknown as JournalEntry;
        await entry.sheet!.render(true);
        return entry.id!;
    }, content);
}

test('plain header text is preserved and gets its link icon', async ({
    authenticatedPage: page,
    openJournal,
}) => {
    await openJournal(linkBlock('Plain Header'));

    const header = page.locator('section.pseudo-embed h3');
    await expect(header.locator('span')).toHaveText('Plain Header');
    await expect(header.locator('i.fa-up-right-from-square')).toHaveCount(1);
});

test('escaped HTML in a header is stripped instead of being rendered', async ({
    authenticatedPage: page,
    openJournal,
}) => {
    await page.evaluate(() => {
        delete (window as unknown as Record<string, unknown>).__journalXss;
    });

    await openJournal(
        linkBlock(
            '&lt;img src=x onerror="window.__journalXss=true"&gt;Safe Header',
        ),
    );

    const header = page.locator('section.pseudo-embed h3');
    await expect(header.locator('span')).toHaveText('Safe Header');
    await expect(header.locator('img')).toHaveCount(0);
    expect(
        await page.evaluate(
            () =>
                (window as unknown as Record<string, unknown>).__journalXss ??
                false,
        ),
    ).toBe(false);
});
