# Ledgerline · Expense approvals

> LoFi prototype built with /sketch. This file is the agent's memory for the prototype.

## Brief
"An expense approval tool for small finance teams."

## Assumptions
- Employees submit expenses one by one (no "reports" grouping in v1).
- One approval step: the submitter's manager. Admins can approve anything.
- Policy is a single rule for v1: lodging over €150/night is flagged, not blocked.
- Plans: Free, Pro, Enterprise. An expired trial makes everything read-only.

## Screens
| File | Purpose | Key components |
|------|---------|----------------|
| screens/index.html | Dashboard: stats, weekly spend, categories, recent activity; first-run checklist for empty accounts | wf-stat, wf-chart, wf-list, wf-checklist, wf-empty |
| screens/expenses.html | My expenses (company expenses for admins, read-only for viewers); new-expense modal | wf-tabs, wf-table, wf-pagination, wf-modal, wf-combobox, wf-upload |
| screens/expense.html | Expense detail: alerts, facts, receipt, history; submit, delete, approve, reject | wf-page-header, wf-alert, dl, wf-timeline, wf-modal |
| screens/approvals.html | Approval queue for managers: tabs, select, bulk approve or reject | wf-table selectable, wf-tabs, wf-modal |
| screens/team.html | Team admin: search, filter by role, invite, change role, remove | wf-search, wf-segmented, wf-menu, wf-tags, wf.confirm |
| screens/billing.html | Plans, payment method, invoices; upgrade gate for an expired trial | wf-gate, wf-card, wf-list |
| screens/app.js | Shared: permissions (`can`), read-only guard with tooltips, nav counts, trial banner | — |

## Data model
- `expenses`: id, merchant, category, amount, date, status (draft · pending · approved · rejected), by, byId, receipt (bool), overPolicy (bool), reason?, note?
- `team`: id, name, role (Submitter · Approver · Admin), email
- `settings` (value): plan, policyLimit, currency, company, integrations?

## Seeded users
| id | Who | Why |
|---|---|---|
| empty | Elif Novak, just joined | Every empty state, first-run checklist |
| submitter | Sam Okafor, employee | Drafts, a rejected expense, missing receipts |
| approver | Alex Reyes, manager | Nine to approve, two over policy: bulk approve and reject |
| power | Priya Walsh, finance admin | 96 expenses, 19 people, every permission: pagination, admin |
| trial-expired | Tomás Meyer, owner | Read-only banner, disabled actions, upgrade path |
| viewer | Rosa Vidal, external accountant | Permission edge case: everything view-only, with reasons |

## Open questions
- Should approvers be able to edit an amount before approving?
- Multi-step approvals (manager, then finance) for large amounts?

## Changelog
- v1: six screens, six seeded users.
