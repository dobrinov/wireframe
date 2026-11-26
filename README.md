<img src="site/logo.svg" width="56" alt="Wireframe logo: the letter w in square brackets">

# Wireframe: agentic LoFi wireframing for Claude Code

**Don’t write the spec. Wireframe it.** A clickable LoFi prototype communicates an idea better than pages of requirements, and it is cheap to change. When everyone agrees, use it as the input for your spec, in whatever format or tool you use (a plain document, Spec Kit, OpenSpec, a team template), and as the brief for HiFi screens.

Type `/sketch` and a one-line brief. Claude plans the screens, data and a cast of seeded test users, then builds a **working** LoFi prototype from the `wf` component library and opens it in your browser. Iterate by prompting in Claude Code, or by clicking anything in the prototype and leaving a comment. Tick **Send to coding agent** and the comment reaches the running Claude Code session, along with the user you were signed in as.

```
/sketch an expense approval tool for small finance teams
```

**Website and live component library:** https://dobrinov.github.io/wireframe/

## What's inside

| Part | Where | What it does |
|---|---|---|
| `/sketch` skill (`/wireframe:sketch`) | `skills/sketch/` | The workflow Claude follows: setup, plan, seed users, build, run, listen for comments, iterate, revise users |
| Component library | `lib/wf.css`, `lib/wf.js` | ~70 greyscale components as plain web components, plus a mock data store and helpers. No build step |
| Style rules | `skills/sketch/reference/STYLE.md` | Tokens, states, anatomy, and a recipe so new components match the existing ones |
| Harness | `lib/harness.js` | Injected into every prototype: user switcher (U), comment mode (C), threads panel (T), pins, live agent activity, live reload |
| `wf` helper | `bin/wf.js`, `src/` | Zero-dependency Node CLI: local server, comment inbox, agent bridge, lint, doctor, setup |
| Installer | `install/bootstrap.sh`, `install/bootstrap.ps1` | For computers without Node: installs a private runtime in `~/.wireframe/runtime`, no admin rights needed |
| Example | `examples/expense-approvals/` | Six screens, six seeded users, the reference prototype |
| Website | `site/`, `scripts/build-site.js` | The marketing page plus the live library, published to GitHub Pages by `.github/workflows/pages.yml`. Preview with `node scripts/build-site.js` and open `_site/index.html` |

## Install

1. In Claude Code:
   ```
   /plugin marketplace add dobrinov/wireframe
   /plugin install wireframe@dobrinov
   ```
   (Working on the kit itself? Use `/plugin marketplace add /path/to/this/folder` instead.)
2. Type `/sketch setup`. Claude checks the computer, installs what's missing (asking first), and creates `~/Wireframes`. Nobody needs to touch a terminal.

Already have Node 18+? `node bin/wf.js setup` does the same from a shell.

## Using it

- `/sketch <brief>`: new prototype in `~/Wireframes/<name>`, opened in the browser.
- `/sketch <brief>` inside a code repository: Claude reads the app first (pages, nav, data model, roles, copy), then wireframes the change on top of the real app. The prototype lives in the repository, in `wireframes/<name>/` by default, with its runtime files gitignored. The hand-over spec names the code each requirement touches.
- Talk to Claude to change it, or comment in the browser: press **C**, click anything, write, and tick *Send to coding agent*.
- Press **U** to switch seeded users. Each one shows a different state: empty, power user, each role, each plan, edge cases. Claude revises the cast as the prototype grows.
- `/sketch` inside a prototype folder resumes it. `/sketch open <name>` opens an older one.

### How comments reach the agent
```
browser ── POST /_wf/api/comments ──▶ wf server ── .wireframe/comments.json + inbox/
                                          │
                       SSE /agent/stream  ▼
Claude Code ◀── `wf watch --once` (background) ── prints the comment, with screen, element and user
      │
      └── edits screens/ → browser live-reloads ── `wf reply <id> "…" --resolve` → pin turns resolved
```
If no session is listening, sent comments wait in `.wireframe/inbox/`. After 20 seconds the server starts a headless `claude -p` run limited to edits and `wf` commands. Turn that off with `{"headless": false}` in `.wireframe/config.json`.

## Updates and changelog

When a new version is out, every prototype shows a banner with what changed and how to update: type `/sketch update` in Claude Code (or run `wf update`). After an update, prototypes show **What's new** once; it is also in the toolbar's **⋯** menu, and `wf changelog` prints it.

The `wf` server checks [`CHANGELOG.md`](CHANGELOG.md) on GitHub's `main` branch at most every 12 hours. It sends nothing about you or your prototypes. Turn it off with `WF_NO_UPDATE_CHECK=1` or `{"updateCheck": false}` in a prototype's `.wireframe/config.json`.

**Releasing:** add a `## <version> · <date>` section at the top of `CHANGELOG.md`, set the same version in `package.json` and `.claude-plugin/plugin.json` (`npm test` checks they match), and push to `main`. Claude Code only offers an update when the version changes.

## `wf` commands
```
wf setup | doctor | new <name> [--dir d] | list | serve [dir] [--open] | library
wf watch [--once] | inbox | reply <id> "<text>" [--resolve] | lint | snapshot [label]
wf users | status | docs [style|components|patterns|personas]
wf version | changelog [--all] | update [--check]
```

## Try the example
```
node bin/wf.js serve examples/expense-approvals --open
node bin/wf.js library --open        # component gallery
```

## Design decisions
- **Lightweight by design.** Prototypes are plain HTML files with `<wf-*>` tags. There is no bundler, framework or npm install. The helper is one Node script with no dependencies, and it binds only to localhost.
- **Data per user.** Each seeded user has their own copy of the data in the browser (localStorage). It resets automatically when the agent edits the seed files, so create, edit and delete really work.
- **Colour is feedback.** Wireframes are greyscale. Blue means agent and orange means comments, so feedback never blends into the design.
