# wf components

Live gallery: run `wf library` and open http://localhost:4320/_wf/library (or go to /_wf/library on any running prototype).
All components are light-DOM custom elements: children you write stay in place, and attributes are plain strings.
Events bubble as `CustomEvent`s; read `e.detail`.

## Page boilerplate
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Approvals · Ledgerline</title>
<link rel="stylesheet" href="/_wf/wf.css">
<script type="module" src="/_wf/wf.js"></script>
</head>
<body class="wf">
  …
  <script type="module">
    const wf = await window.wfReady;
    …
  </script>
</body>
</html>
```

## Layout
| Tag | Attributes | Notes |
|---|---|---|
| `wf-app` | — | Shell: `wf-sidebar` plus `<main>`. Wraps on phones. |
| `wf-sidebar` | `brand` | Holds `wf-nav-item` and `wf-nav-group`. |
| `wf-nav-item` | `href icon count active` | Marks itself active when `href` matches the page. |
| `wf-nav-group` | — | Small uppercase section label. |
| `wf-topbar` | `brand variant="marketing"` | Row of links and actions. Use `<wf-spacer>` to push items right. |
| `wf-page` | `width="narrow\|full"` | Centred content column. |
| `wf-page-header` | `title subtitle crumbs="Label\|/href / Label"` | Children become the actions on the right. |
| `wf-stack` / `wf-row` | `gap="0\|1\|2\|4\|6\|8" align justify="between\|end\|center" nowrap` | Flex column / row. A child with `grow` takes the free space. |
| `wf-grid` | `cols="1-6" gap` | Child `span="2\|3\|all"`. Collapses on small screens. |
| `wf-split` | `ratio="1:2"` | Two columns that wrap. |
| `wf-card` | `title action action-href variant="soft\|flat" padding="0" href` | Bordered box. With `href` the whole card is clickable. |
| `wf-section` | `title subtitle` | Titled group. |
| `wf-divider` | `label` | Horizontal rule, optionally with a label ("or"). |
| `wf-spacer` | — | Flexible gap. |

## Content
| Tag | Attributes |
|---|---|
| `wf-text-ph` | `lines heading`: grey text bars, only when the copy is unknown |
| `wf-image` | `label ratio="4:3" height`: crossed placeholder |
| `wf-icon` | `name size label`: see the icon list below |
| `wf-avatar` | `name size` (initials) |
| `wf-avatar-group` | `names="A B, C D" max size` |
| `h1`–`h4`, `p`, `small`, `kbd`, `code`, `dl/dt/dd`, `details/summary`, `ul.wf-tree` | Styled natively inside `body.wf` |

## Inputs
| Tag | Attributes / API | Events |
|---|---|---|
| `button` | `data-variant="primary\|ghost\|danger" data-size="sm\|lg" data-icon-only disabled` | native |
| `a.wf-btn` | same as `button`; a link that looks like a button | — |
| `.wf-btn-group` | span around buttons | — |
| `wf-field` | `label help error required optional`; wraps one `input`, `select`, `textarea`, `wf-combobox` or `wf-tags` | — |
| `input`, `select`, `textarea` | native, styled; `type="date\|email\|number\|search\|range"` | native |
| `label.wf-check` | wraps a checkbox or radio | native |
| `wf-switch` | `label checked disabled name`; `.checked` | `change {checked}` |
| `wf-segmented` | `options="A,B,C" value`; `.value` | `change {value}` |
| `wf-stepper` | `value min max step label`; `.value` | `change {value}` |
| `wf-combobox` | `options="A, B" value placeholder name` | `change {value}` |
| `wf-search` | `placeholder shortcut="⌘K" value` | `search {value}` |
| `wf-tags` | `value="a,b" placeholder`; `.value` (array) | `change {value}` |
| `wf-upload` | `label hint multiple files="a.pdf,b.jpg"`; `.files` | `change {files}` |
| `form.wf-form` | vertical form layout; read it with `wf.formData(form)` | native `submit` |

## Navigation
| Tag | Attributes | Events |
|---|---|---|
| `wf-tabs` | `value variant="pill" counts="9,2"`. Children with `data-tab="Name"` are panels; or `tabs="A,B"` with no panels | `change {value}` |
| `wf-breadcrumbs` | children `<a>` / `<span>` | — |
| `wf-pagination` | `total per-page page` (or `pages`) | `change {page}` |
| `wf-steps` | `items="A,B,C" current="2"` | — |
| `wf-menu` | `label` (none = ⋯ icon) `icon align="right" variant size`; children `wf-menu-item` (`icon shortcut href value variant="danger"`) and `<hr>` | `select {value, item}` |
| `wf-command` | children `wf-menu-item`; ⌘K opens it; lists every `wf-nav-item` | `select {value}` |

## Data display
| Tag | Attributes / API | Events |
|---|---|---|
| `wf-table` | wraps `<table>`. `sortable selectable empty="No X" empty-text empty-icon`. `tr[data-id]`, `tr[data-href]` (clickable row), `th[data-nosort]`, `td[data-sort="123"]`, `td.wf-num`. `.selected` → ids | `selection {ids}`, `sort {column, dir}` |
| `wf-stat` | `label value delta="+12%" trend="3,4,6"` | — |
| `wf-chart` | `type="bar\|line\|area\|donut" values="1,2,3\|2,3,4" labels="A,B,C" series="2026,2025" height label` | — |
| `wf-badge` | `status="done\|problem\|archived\|count"` (none = pending/neutral) | — |
| `wf-tag` | — | — |
| `wf-list` / `wf-list-item` | list `variant="plain"`; item `title meta avatar icon href unread`; children = trailing content | — |
| `wf-timeline` / `wf-timeline-item` | item `title meta done` | — |
| `wf-kanban` / `wf-kanban-column` | column `title`; children `wf-card` | — |
| `wf-calendar` | `month="2026-11" marks="3,8" selected="25"` | `change {date}` |
| `wf-map` | `pins="30:40 60:55" ratio` | — |
| `wf-video` | `ratio` | — |
| `wf-file` | `name size` | — |
| `wf-thread` / `wf-message` | message `name time mine` | — |

## Feedback and overlays
| Tag / API | Attributes | Notes |
|---|---|---|
| `wf-modal` | `id title width`; a `<footer>` child holds the buttons | Open: `data-open="id"` on any button, or `wf.open(id)`. Close: `data-close` on any element inside, or Esc. Events `open` and `close`. |
| `wf-drawer` | `id title side="right\|left" width` | Same as the modal. |
| `wf-popover` | `id title placement="bottom\|top\|left\|right\|bottom-start" width` | `data-open="id"` toggles it, anchored to the button. `data-close` closes. |
| `data-tip` | on any element: `data-tip="Text" data-tip-pos data-tip-kbd` | Tooltip on hover and focus. Use it to explain disabled controls. |
| `wf.toast(text, {action, onAction, variant:'problem'})` | — | Or `data-toast="Text"` on a button. `<wf-toast>` is the static version. |
| `await wf.confirm({title, text, confirm, cancel, danger})` | — | Returns true or false. |
| `wf-alert` | `variant="info\|warning\|problem\|success" title dismissible` | Inline message. |
| `wf-banner` | `action href dismissible` | Full-width strip (trial ends, offline…). |
| `wf-progress` | `value max label` | — |
| `wf-spinner`, `wf-skeleton` | skeleton: `lines avatar` | Loading. |
| `wf-empty` | `icon title text variant="error"`; children = actions | Empty, error and 404 states. |
| `wf-checklist` | `title items="Step:done,Step"` | Onboarding. |
| `wf-gate` | `title text action href` | Upgrade or paywall. |
| `wf-note`, `wf-callout` | — | Annotations: sticky note and numbered marker. |

## Icons
plus minus x check chevron-down chevron-up chevron-left chevron-right arrow-right arrow-left arrow-up arrow-down search home inbox file folder user users settings bell calendar clock chart credit-card receipt upload download edit trash more more-vertical filter sort link lock unlock mail phone map-pin star heart image menu logout help info alert external copy eye refresh grid list tag message send play pause money building cart box globe shield zap bookmark sparkle sidebar dashboard activity

## Helpers (`const wf = await window.wfReady`)
- `wf.user`: the signed-in seeded user (everything in their `seed/users.json` entry).
- `wf.store.all(col)`, `.get(col, id)`, `.where(col, fn|{field: value})`, `.count(col, fn?)`, `.add(col, obj)` → item with `id`, `.update(col, id, patch|fn)`, `.remove(col, id)`, `.set(col, items)`, `.value(key[, v])`, `.subscribe(fn)`, `.reset()`.
- `wf.html\`…\``: escaped template. Arrays join; `wf.raw(s)` skips escaping. `false`, `null` and `undefined` render nothing.
- `wf.mount('#sel', () => wf.html\`…\`)`: renders now and again after every store change.
- `wf.on('click', '[data-x]', (e, el) => …)`: delegated, so it survives re-renders.
- `wf.params`: query string as an object. `wf.go(url)`.
- `wf.format.money(n, 'EUR')`, `.number(n)`, `.date(iso)`, `.shortDate(iso)`, `.ago(iso)`.
- `wf.formData(form)`, `wf.toast()`, `wf.confirm()`, `wf.open(id)`, `wf.close(id)`.
