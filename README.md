# Wireframe kit: agentic LoFi wireframing for Claude Code

Type `/wireframe` and a one-line brief. Claude plans the screens, data and a cast of seeded test users, then builds a **working** LoFi prototype from the `wf` component library and opens it in your browser. Iterate by prompting in Claude Code, or by clicking anything in the prototype and leaving a comment. Tick **Send to coding agent** and the comment reaches the running Claude Code session, along with the user you were signed in as.

```
/wireframe an expense approval tool for small finance teams
```

## What's inside

| Part | Where | What it does |
|---|---|---|
| `/wireframe` skill | `skills/wireframe/` | The workflow Claude follows: setup, plan, seed users, build, run, listen for comments, iterate, revise users |
| Component library | `lib/wf.css`, `lib/wf.js` | ~70 greyscale components as plain web components, plus a mock data store and helpers. No build step |
| Style rules | `skills/wireframe/reference/STYLE.md` | Tokens, states, anatomy, and a recipe so new components match the existing ones |
| Harness | `lib/harness.js` | Injected into every prototype: user switcher (U), comment mode (C), pins and threads, agent status, live reload |
| `wf` helper | `bin/wf.js`, `src/` | Zero-dependency Node CLI: local server, comment inbox, agent bridge, lint, doctor, setup |
| Installer | `install/bootstrap.sh`, `install/bootstrap.ps1` | For computers without Node: installs a private runtime in `~/.wireframe/runtime`, no admin rights needed |
| Example | `examples/expense-approvals/` | Six screens, six seeded users, the reference prototype |

## Install

1. In Claude Code:
   ```
   /plugin marketplace add /path/to/this/folder
   /plugin install wireframe@wireframe-kit
   ```
   (Or `/plugin marketplace add <github-owner>/<repo>` once it is pushed.)
2. Type `/wireframe setup`. Claude checks the computer, installs what's missing (asking first), and creates `~/Wireframes`. Nobody needs to touch a terminal.

Already have Node 18+? `node bin/wf.js setup` does the same from a shell.

## Using it

- `/wireframe <brief>`: new prototype in `~/Wireframes/<name>`, opened in the browser.
- Talk to Claude to change it, or comment in the browser: press **C**, click anything, write, and tick *Send to coding agent*.
- Press **U** to switch seeded users. Each one shows a different state: empty, power user, each role, each plan, edge cases. Claude revises the cast as the prototype grows.
- `/wireframe` inside a prototype folder resumes it. `/wireframe open <name>` opens an older one.

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

## `wf` commands
```
wf setup | doctor | new <name> | serve [dir] [--open] | library
wf watch [--once] | inbox | reply <id> "<text>" [--resolve] | lint | snapshot [label]
wf users | status | docs [style|components|patterns|personas]
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
