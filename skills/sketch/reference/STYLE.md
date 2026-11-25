# wf style rules

Every wireframe uses only these rules and the tokens in `/_wf/wf.css`. Follow them, and a new component, whether yours or the agent's, will look like it always belonged. `wf lint` checks most of them.

## Principles
1. **Structure, not style.** Show what is there and how it behaves. No brand, imagery or decoration.
2. **Greyscale only.** Colour belongs to the harness: blue for the agent, orange for comments. A design that uses colour reads as feedback.
3. **States without colour.** Fill, stroke weight, dashes and a text mark carry meaning. Nothing relies on red or green.
4. **One stroke language.** Three line weights, five radii, one flat offset shadow. Never blur, gradients or glow.

## Tokens (CSS variables; never write raw values)
| Token | Value | Use |
|---|---|---|
| `--wf-ink` | #1C1C1A | text, primary buttons, selected, borders of controls in focus |
| `--wf-ink-2` | #3A3A36 | body copy |
| `--wf-muted` | #55554F | captions, meta, placeholders |
| `--wf-line` | #8A887F | default control border |
| `--wf-line-soft` | #C9C7BF | disabled border, image placeholder lines |
| `--wf-divider` | #D6D4CC | card edges, dividers, text-placeholder bars |
| `--wf-skeleton` | #E3E1DA | loading skeletons, table row lines |
| `--wf-fill` | #EFEDE6 | hover, placeholder fills, flat cards |
| `--wf-surface` | #FFFFFF | cards, inputs |
| `--wf-paper` | #F7F6F2 | page ground |
| `--wf-stroke-thin` / `--wf-stroke` / `--wf-stroke-strong` | 1 / 1.5 / 2 px | dividers / controls and frames / focus and current |
| `--wf-r-xs` `-sm` `-md` `-lg` `-pill` | 4 / 6 / 8 / 10 / 999 px | tags and checkboxes / controls / menus and popovers / cards and panels / chips, search, toggles |
| `--wf-s-1 … --wf-s-12` | 4 8 12 16 20 24 32 48 | 4pt spacing: inside a control 8–12, between controls 8–16, card padding 16–20, sections 24–48 |
| `--wf-h-sm` / `-md` / `-lg` | 28 / 36 / 44 px | control heights |
| `--wf-shadow-1` / `-2` | 4px 4px 0 divider / 6px 6px 0 line | menus and popovers / modals |
| `--wf-font` / `-display` / `-mono` | Inter / Space Grotesk / JetBrains Mono | body / h1–h2 / ids, keys, code |

Type scale: Display 28/700 (Space Grotesk) · Title 20/600 (Space Grotesk) · Heading 16/600 · Body 14/400, line-height 1.45 · Label 13/500 · Caption 12 muted · Mono 12.

## States: drawn the same way everywhere
| State | Drawing |
|---|---|
| Default | 1.5px `--wf-line` border, white surface |
| Hover | `--wf-fill` background, nothing moves |
| Focus | 2px `--wf-ink` border or outline |
| Selected / on | ink fill, white text, ✓ mark where it fits |
| Disabled | `--wf-line-soft` border, `--wf-line` text, `#F2F1EC` fill; add `data-tip` explaining why |
| Error / problem | dashed ink border, plus "✕ message" text below |
| Loading | `wf-skeleton` / `wf-spinner` |
| Empty | `wf-empty`: dashed soft frame, one line, one action |

Status words always appear as text. Status chips: solid ink = done or positive, outline = neutral or pending, dashed = problem, soft line = archived.

## Anatomy of a control
Label (13/500) → 6px gap → control (36px high, radius 6, 1.5px line, 0 12px padding) → 6px gap → helper (12px muted) or error (✕ prefix).

## Icons
1.6px line icons with no fill, 16–20px: `<wf-icon name="…">`. An unknown name renders a soft square. Never use emoji or icon fonts.

## Do / don't
- Do: primary = ink fill. Don't: coloured buttons.
- Do: flat offset shadow plus stroke. Don't: blurred shadows.
- Do: meaning in text plus dash. Don't: a red dot alone.
- Don't: photos or logos (use `wf-image`), gradients, more than one radius in a component, other fonts.

## Adding a new component
1. Check the library first: can two existing parts make it?
2. Name it `wf-<noun>` with one job. Put it in the prototype's `screens/components.js` (`customElements.define`) and `screens/app.css`.
3. Build only from `var(--wf-*)` tokens. Never raw hex.
4. Pick the closest sibling and copy its height, radius and stroke. For example, a rating is a segmented control.
5. Draw all 8 states, plus empty data if it shows data.
6. Put a real element underneath: `button`, `input`, `label`, `aria-label`.
7. Note it in WIREFRAME.md under "Local components".
