# Changelog

What changed in each version of Wireframe. Prototypes show the entries newer than the installed version in an update banner, and the entries for the installed version under **What's new**.

To release: add a `## <version> · <date>` section at the top, set the same version in `package.json` and `.claude-plugin/plugin.json` (the tests check they match), and push to `main`. Claude Code only offers an update when the version number changes. Keep each line short and written for the people using the prototypes.

## 0.2.0 · 2026-11-26

- **Update notices.** When a new version of Wireframe is out, prototypes show a banner with what changed and how to update. Type `/sketch update` in Claude Code to get it.
- **What's new.** After updating, prototypes show what the new version brings. Find it any time in the toolbar's **⋯** menu.
- **Images in comments.** Paste or drop screenshots into a comment; the agent sees them too.
- New `wf` commands: `wf update` checks for a new version, `wf changelog` lists what changed.

## 0.1.0 · 2026-11-26

- First release: `/sketch` builds working LoFi prototypes from a one-line brief, with seeded test users, a user switcher, on-screen comments that reach Claude Code, and the `wf` component library.
- Existing-project mode: inside a code repository, `/sketch` reads the app first and wireframes the change on top of it.
