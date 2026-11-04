// Local-only config: run the playwright suite against an already-running Foundry
// instance (FOUNDRY_URL, default http://localhost:30014) instead of docker.
import base from './playwright.config';
import { defineConfig } from '@playwright/test';

const url = process.env.FOUNDRY_URL ?? 'http://localhost:30014';
const state = process.env.FOUNDRY_STATE ?? '/private/tmp/claude-501/-Users-dcmitchell-dev-cosmere-rpg/297e53f9-a54d-41a6-8c17-ca0fc3755177/scratchpad/pwt/state.json';

export default defineConfig({
    ...base,
    reporter: 'line',
    globalSetup: process.env.FOUNDRY_SETUP ?? '/private/tmp/claude-501/-Users-dcmitchell-dev-cosmere-rpg/297e53f9-a54d-41a6-8c17-ca0fc3755177/scratchpad/pwt/setup.mjs',
    globalTeardown: undefined,
    use: { ...base.use, baseURL: url, storageState: state },
    projects: [
        {
            name: 'chrome',
            use: { channel: 'chrome', viewport: { width: 1920, height: 1080 } },
        },
    ],
});
