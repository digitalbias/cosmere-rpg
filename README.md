# Foundry VTT - Cosmere Roleplaying Game System
Welcome to the Foundry VTT Cosmere Roleplaying Game System! This community project provides the core system for running 
the Cosmere Roleplaying Game within Foundry VTT.

> [!NOTE]
> This is Dave Mitchell's personal fork of [the-metalworks/cosmere-rpg](https://github.com/the-metalworks/cosmere-rpg). It runs on Foundry VTT v14 and is not the official release. See [About this fork](#about-this-fork).

## About this fork
The upstream project does not accept work made with generative AI. That follows the no-AI policy Brotherwise Games adopted for the Cosmere RPG. I respect their right to run their project that way, but I don't share that view.

I believe AI tools are worth using. They don't replace the people doing this work. They make those people more capable. I use them here because they let me ship working features and fixes much faster.

AI doesn't make code better on its own. It makes the work go faster. Someone with no coding experience will still produce slop with AI. A professional brings the guardrails they already rely on: code review, tests, and the hard-won scars of past mistakes. With AI, that person writes better code because they can do more of that work in the same time. That's the whole point.

It's also why this fork has Playwright UI tests. They're one of those guardrails. They check that a fix actually works in Foundry before I ship it. I learned a long time ago that tests make writing code both better and faster. Credit for that goes to Martin Fowler's *Refactoring*.

That's why I diverged from the upstream repository. I didn't want to wait months for a version that works on Foundry v14. This fork has:
- Foundry v14 compatibility fixes (see [docs/v14-migration.md](./docs/v14-migration.md))
- Selected fixes and features from upstream pull requests that haven't been merged yet
- Playwright tests for the changes I've made

This fork is built for my own games. It is not published to the Foundry package listing, and changes here are not sent back upstream.

## Installation Instructions
**This fork (Foundry v14)**
1. In Foundry VTT, go to **Game Systems** > **Install System**.
2. Paste the following URL in the **Manifest URL** field:  
   `https://github.com/digitalbias/cosmere-rpg/releases/latest/download/system.json`
3. Click **Install**.

**Official release (Foundry v13)**  
The official system can be installed from the system browser in Foundry VTT by searching for "Cosmere Roleplaying Game", or manually with this manifest URL:  
`https://raw.githubusercontent.com/the-metalworks/cosmere-rpg/main/src/system.json`

## Feature requests and bug reports
For problems with this fork, open an [Issue](https://github.com/digitalbias/cosmere-rpg/issues) here.

For the official system, use the [upstream issue tracker](https://github.com/the-metalworks/cosmere-rpg/issues). Please don't report problems from this fork there. For guidelines on how to create Issues, please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Contributing
Contributions to the official system go through the upstream project. Check out [CONTRIBUTING.md](./CONTRIBUTING.md).

> [!IMPORTANT]
> The upstream project, following Brotherwise Games' no-AI policy for the Cosmere RPG, does not accept contributions that were created, in whole or in part, using generative AI tools. Much of the work in this fork was made with AI assistance, so it is not eligible for upstream contribution.

## License
The code and original assets in this project are licensed under the [MIT License](./LICENSE).

However, some content in this repository is included with permission from Brotherwise Games and is **not** covered by the MIT License.

This includes (but may not be limited to) the following directories:
- `src/packs/rules/`
- `src/packs/tables/`

These directories contain official material from the *Cosmere Roleplaying Game* and are subject to separate terms.  
Each includes a `LICENSE` file with the relevant details.

Do not copy, redistribute, or reuse this content outside of this project.
