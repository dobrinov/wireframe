// Shared behaviour for every Ledgerline screen: permissions, nav counts, plan banner.
const wf = await window.wfReady;

export { wf };
export const can = (perm) => !!wf.user?.permissions?.includes(perm);
export const readOnly = wf.user?.plan === 'trial_expired';
export const myId = wf.user?.memberId;
export const mine = (e) => e.byId === myId;
export const toApprove = () => (can('approve') ? wf.store.where('expenses', (e) => e.status === 'pending' && !mine(e)) : []);

// Disable a control the current user may not use, and say why.
export function guard(el, perm, why) {
  if (!el) return;
  const blocked = readOnly ? 'Your trial has ended. Upgrade to make changes.' : perm && !can(perm) ? why : null;
  if (blocked) { el.disabled = true; el.setAttribute('aria-disabled', 'true'); el.dataset.tip = blocked; if (el.tagName === 'A') { el.removeAttribute('href'); el.tabIndex = 0; } }
}

export const statusBadge = (s) => wf.html`<wf-badge status="${{ approved: 'done', rejected: 'problem', draft: 'archived' }[s] || ''}">${s[0].toUpperCase() + s.slice(1)}</wf-badge>`;

// Nav: counts and visibility follow the signed-in user.
const navApprovals = document.getElementById('nav-approvals');
if (navApprovals && !can('approve')) navApprovals.remove();
const navTeam = document.getElementById('nav-team');
if (navTeam && !can('admin') && !can('view')) navTeam.remove();
const paintNav = () => {
  const n = toApprove().length;
  if (navApprovals?.isConnected) n ? navApprovals.setAttribute('count', n) : navApprovals.removeAttribute('count');
  const drafts = wf.store.count('expenses', (e) => mine(e) && e.status === 'draft');
  const navExp = document.getElementById('nav-expenses');
  if (navExp) drafts ? navExp.setAttribute('count', drafts) : navExp.removeAttribute('count');
};
paintNav();
wf.store.subscribe(paintNav);

// Plan banner for an expired trial, above every page.
if (readOnly) {
  const page = document.querySelector('main');
  const b = document.createElement('wf-banner');
  b.setAttribute('action', 'Choose a plan');
  b.setAttribute('href', '/billing.html');
  b.textContent = 'Your free trial ended 3 days ago. Everything is read-only until you choose a plan.';
  page?.prepend(b);
}

// User menu in the top bar.
const who = document.getElementById('who');
if (who) who.setAttribute('name', wf.user?.name || '');
