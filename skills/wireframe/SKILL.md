---
name: wireframe
description: Build and iterate working LoFi wireframe prototypes from a one-line brief, with seeded test users, a user switcher and on-screen comments that come back to you. Use when the user types /wireframe, asks to "wireframe", "prototype" or "mock up" an app, flow or screen, wants to change an existing wireframe prototype, asks to set up or fix the wireframing tool, or when comments from a prototype arrive.
---

# /wireframe

You build clickable, **LoFi** prototypes with the `wf` library and keep improving them with the user. The person may not be technical: speak plainly, never ask them to type terminal commands, and do the setup yourself.

## 0. Find the `wf` helper

This skill lives in a plugin. Its root is two folders up from this skill's base directory (`<base>/../..`); call it `KIT`.
- If `wf` is on PATH, use `wf`.
- Otherwise use `node "KIT/bin/wf.js"`, and offer to run `node "KIT/bin/wf.js" setup` so `wf` works everywhere.
- If `node` is missing (or older than 18), go to **Setup**.

In the steps below, `wf` means whichever of these works.

## 1. What was asked

Read the arguments after `/wireframe`:

| Arguments | Do |
|---|---|
| `setup`, `doctor`, or something is broken | **Setup** |
| a description of something to build | **New prototype** |
| nothing, or a change request, inside a prototype folder (has `seed/users.json`) | **Iterate** |
| `users` / "who are the test users" | **Revise users** |
| `inbox` / "check comments" | **Handle comments** |
| `open <name>` / "show me <name>" | Run it (step 3.8) from `~/Wireframes/<name>` |

If there are no arguments and you are not inside a prototype, list `~/Wireframes/*` and ask which to open, or what to build.

## 2. Setup (non-technical friendly)

1. Run `wf doctor --json` (or `node KIT/bin/wf.js doctor --json`). If node itself is missing, skip to step 3.
2. For each failed check, say in one plain sentence what is missing, then fix it yourself after a yes:
   - `wf` → `node KIT/bin/wf.js setup` (makes `~/Wireframes`, installs the `wf` command, adds it to PATH).
   - `home` → same `setup` command.
   - `plugin` → it is already running if you are reading this, so just mention `/wireframe` is ready.
   - `claude` → cannot be missing while you run; ignore.
3. **No Node.js** → explain: "The prototypes need a small runtime (about 50 MB). I'll install a private copy just for this tool. It won't change anything else on your computer." Then run `sh KIT/install/bootstrap.sh` on Mac/Linux or `powershell -ExecutionPolicy Bypass -File KIT/install/bootstrap.ps1` on Windows. It downloads Node into `~/.wireframe/runtime`, then runs `wf setup`.
4. Re-run `wf doctor` and confirm in one line: "All set. Tell me what you'd like to sketch."

## 3. New prototype

1. **Understand the brief.** If it is really ambiguous (you can't tell who uses it or what the main job is), ask **one** round of at most 3 short questions. Otherwise decide, and list your assumptions in WIREFRAME.md and in your reply.
2. **Read the references before writing any screen**, once per session: `KIT/skills/wireframe/reference/STYLE.md`, `COMPONENTS.md`, `PATTERNS.md`, `PERSONAS.md`.
3. **Create:** `wf new "<short name>" --json`. Work inside the folder it prints, at `~/Wireframes/<slug>`.
4. **Plan in WIREFRAME.md:** brief, assumptions, 4–8 screens for v1 (one HTML file each), the data model (collections and fields), seeded users and why each exists, and open questions. Keep v1 small and end to end. One flow that works beats ten dead screens.
5. **Seed users and data** per PERSONAS.md: `seed/users.json` plus one `seed/<id>.json` per user (and `seed/shared.json` for data everyone sees). Make the data realistic, internally consistent, and specific to the domain. Each user's `stats` must match their seed.
6. **Build screens** in `screens/`, following PATTERNS.md:
   - Every screen links `/_wf/wf.css` and `/_wf/wf.js`, uses `<body class="wf">` and the same shell (`wf-app` + `wf-sidebar` or `wf-topbar`), and every nav link goes somewhere real.
   - Read and write data only through `wf.store`, so create, edit, delete, filter and empty states really work for each seeded user.
   - Branch on `wf.user` (role, plan, flags) for permissions and entitlements: hide or disable controls, and give disabled ones a `data-tip` explaining why.
   - Use only library components and tokens. If something is missing, build it per STYLE.md's recipe in `screens/components.js` or `screens/app.css`, and note it in WIREFRAME.md.
7. **Check:** `wf lint` and fix everything it reports.
8. **Run it:**
   - Start `wf serve --open` with your shell tool's **background** mode. Don't wait on it; it runs until stopped. If it says "Already running", reuse that URL.
   - Then start **listening** (section 5).
9. **Hand over** in a few lines:
   - the URL;
   - what was built;
   - your assumptions;
   - the seeded users and what each shows;
   - how to iterate: "Press **U** to switch user, **C** to comment on anything. Tick *Send to coding agent* and I'll pick it up. Or just tell me here."

## 4. Iterate (prompts in the terminal)

1. Read WIREFRAME.md and the screens involved before changing anything.
2. Before a big change, run `wf snapshot "<what>"`.
3. Make the change across every affected screen, the seed data and the users. Keep it LoFi and on-library. The open browser reloads by itself.
4. **Revise users** whenever a change adds a new state, role, plan, limit or permission (section 6).
5. Run `wf lint`, add a line to the changelog in WIREFRAME.md, and reply in one or two plain sentences about what changed and which user shows it best.

## 5. Listen for comments (keep this running)

While a prototype is open in this session, always have exactly one `wf watch --once` running **in the background** from the prototype folder.

When it finishes, its output lists one or more comments. For each one:
- **Screen** is the file to change. **Element** is a CSS selector for what they clicked. **Viewed as** is the seeded user they were signed in as, so reproduce the problem with that user's data and permissions.
- If it is clear, make the change, then `wf reply <id> "<one-line summary of what changed>" --resolve`.
- If it is unclear or needs a decision, `wf reply <id> "<your question>"` (no `--resolve`) and also ask in the terminal.

Then start `wf watch --once` in the background again. To see everything waiting at any time, run `wf inbox`.

If the user closes the session, comments sent from the browser wait in `.wireframe/inbox/`. The helper may start a headless run for them after about 20 seconds. Turn that off with `{"headless": false}` in `.wireframe/config.json`.

## 6. Revise users

The cast of seeded users is part of the design and must evolve with it. Follow PERSONAS.md.
- On every iteration, ask yourself whether a new feature, state or rule needs a user to show it, and whether an existing user has become pointless.
- When you add a user, set `addedIn` (the version, e.g. `"v3"`) and `addedBecause` (e.g. `"comment #12"` or `"billing added"`).
- Keep `why` and `tests` accurate, and keep `stats` matching the seed.
- Tell the user about cast changes in one line.

## Rules

- **LoFi, always.** Greyscale, wf components and tokens, real copy where known, `wf-text-ph` / `wf-image` where not. No colours, images, gradients, blurred shadows, emoji or icon fonts. `wf lint` enforces most of this.
- **No build tools or frameworks.** Use plain HTML and small inline `<script type="module">` blocks. Do not add npm packages or CDNs.
- **Working, not pictures.** Buttons do something, forms save to the store, and lists react. Use `wf.toast` and modals for outcomes.
- **Never edit** `.wireframe/comments.json` or files in `KIT`. Use `wf reply`.
- **Plain language** with the person. Name screens and users, not files and selectors, unless they ask.
