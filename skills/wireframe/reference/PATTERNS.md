# Screen patterns

Copy these patterns; they keep every prototype working the same way. A complete example lives in `KIT/examples/expense-approvals/`.

## Project layout
```
WIREFRAME.md          brief, screens, data model, users, decisions, changelog
screens/index.html    start screen (served at /)
screens/<name>.html   one file per screen; link between them with /<name>.html
screens/app.css       optional: local styles (tokens only)
screens/components.js optional: local wf-* components (see STYLE.md recipe)
seed/users.json       the cast of seeded users (see PERSONAS.md)
seed/<id>.json        that user's data: { "data": { "<collection>": [ … ] } }
seed/shared.json      data every user sees, merged under their own
```

## Shared shell
Every screen repeats the same shell, so navigation always works. Keep the nav identical across screens. The active item highlights itself.
```html
<wf-app>
  <wf-sidebar brand="Ledgerline">
    <wf-nav-item href="/" icon="dashboard">Dashboard</wf-nav-item>
    <wf-nav-item href="/approvals.html" icon="inbox" id="nav-approvals">Approvals</wf-nav-item>
  </wf-sidebar>
  <main>
    <wf-page> … </wf-page>
  </main>
</wf-app>
```
Set a live count on a nav item with `wf.mount`, or by setting its `count` attribute once the store is ready.

## List screen (tabs, select, bulk action, empty state)
```html
<wf-page-header title="Approvals"><button data-variant="primary" id="approve" disabled data-tip="Select rows first">Approve selected</button></wf-page-header>
<wf-tabs id="tabs" tabs="Waiting,Done"></wf-tabs>
<wf-table id="table" sortable selectable empty="Nothing waiting" empty-text="New expenses from your team appear here.">
  <table><thead><tr><th>Merchant</th><th>By</th><th class="wf-num">Amount</th></tr></thead><tbody id="rows"></tbody></table>
</wf-table>
<script type="module">
  const wf = await window.wfReady;
  const ui = { tab: 'Waiting' };                       // screen state lives in a plain object
  const rows = () => wf.store.where('expenses', (e) => (ui.tab === 'Waiting') === (e.status === 'pending'));
  const render = wf.mount('#rows', () => wf.html`${rows().map((e) => wf.html`
    <tr data-id="${e.id}" data-href="/expense.html?id=${e.id}">
      <td>${e.merchant}</td><td>${e.by}</td><td class="wf-num">${wf.format.money(e.amount)}</td>
    </tr>`)}`);                                        // re-renders on every store change
  document.getElementById('tabs').addEventListener('change', (e) => { ui.tab = e.detail.value; render(); });

  const table = document.getElementById('table');
  const btn = document.getElementById('approve');
  table.addEventListener('selection', (e) => { btn.disabled = !e.detail.ids.length; });
  btn.onclick = () => {
    const ids = table.selected;
    ids.forEach((id) => wf.store.update('expenses', id, { status: 'approved' }));
    btn.disabled = true;
    wf.toast(`Approved ${ids.length}`);
  };
</script>
```
`wf.mount` returns its paint function: call it after changing `ui` state. Store changes repaint by themselves.

## Detail screen
```js
const wf = await window.wfReady;
const item = wf.store.get('expenses', wf.params.id);
if (!item) document.querySelector('wf-page').innerHTML = '<wf-empty variant="error" title="Expense not found"><a class="wf-btn" href="/">Back</a></wf-empty>';
```

## Create / edit form
```html
<form class="wf-form" id="f">
  <wf-field label="Merchant" required><input name="merchant"></wf-field>
  <wf-field label="Amount"><input name="amount" type="number" step="0.01"></wf-field>
  <wf-row justify="end"><a class="wf-btn" href="/expenses.html">Cancel</a><button data-variant="primary">Save</button></wf-row>
</form>
<script type="module">
  const wf = await window.wfReady;
  document.getElementById('f').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = wf.formData(e.target);
    if (!v.merchant) { e.target.querySelector('wf-field').setAttribute('error', 'Required'); return; }
    const it = wf.store.add('expenses', { ...v, amount: Number(v.amount), status: 'draft', by: wf.user.name });
    wf.toast('Expense saved');
    setTimeout(() => wf.go(`/expense.html?id=${it.id}`), 400);
  });
</script>
```
Use a `wf-modal` for quick creates that stay on the same screen.

## Permissions and plans: branch on the seeded user
```js
const canApprove = wf.user.permissions?.includes('approve');
approveBtn.disabled = !canApprove;
if (!canApprove) approveBtn.dataset.tip = 'Only approvers can approve expenses';
if (wf.user.plan === 'trial_expired') document.querySelector('wf-page').prepend(Object.assign(document.createElement('wf-banner'), { innerHTML: 'Your trial has ended' }));
```
Put the fields you branch on (`role`, `plan`, `permissions`, `limits`…) into each user in `seed/users.json`. They come through as `wf.user`.

## Empty, loading and error states
- Each list must render a `wf-empty` for a user with no data (the `empty` attribute does this for `wf-table`).
- Where a loading state matters to the design, render a `wf-skeleton` first, then swap in the data after `setTimeout(…, 600)`.
- Errors: `wf-empty variant="error"` or `wf-alert variant="problem"`.

## Sign-in and onboarding screens
The harness already handles who the user is (press U). Add a sign-in screen only if the product's own sign-in flow is part of what is being designed. It can just `wf.go('/')` on submit.
