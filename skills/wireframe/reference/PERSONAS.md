# Seeded users

Every prototype ships with a cast of seeded users. Each one exists to show a **different state** of the product. Signing in as them (press U in the prototype) is how the user explores empty states, permissions, plans and edge cases without editing data. The cast is designed per project and **revised as the prototype evolves**.

## Choosing the cast (4–7 users is typical)
Always include:
1. **Empty**: just signed up with zero data. Shows every empty state and first-run onboarding.
2. **Power / everything**: lots of data, every feature and integration on, the highest plan. Stress-tests long lists, pagination, settings and long names.

Then add one user per real difference in the product:
- **Each role with different permissions** (submitter vs approver vs admin vs viewer or external). A role only gets its own user if the UI differs for it.
- **Each plan or entitlement state** that changes the UI (free vs pro, trial active, trial expired or past-due, a limit reached).
- **Lifecycle states** that matter: mid-onboarding, a suspended account, a pending invite.
- **Edge cases the brief hints at**: a very long name or locale, a failed payment, an item stuck in error, a user in another currency or timezone.

Don't add a user who looks the same as another. If two users would show the same screens, merge them.

## Rules for each user
- `why` says in one sentence which states this user exists to show.
- `tests` lists 2–4 things to try as them.
- `stats` must match their seed data exactly. The switcher shows these numbers.
- Seed data is realistic, specific to the domain and internally consistent: totals add up, dates are recent (relative to today), and ids referenced across collections exist.
- Use plausible names from a mix of backgrounds and keep the `@demo.wf` emails. Never use real people or companies.

## seed/users.json
```json
{
  "users": [
    {
      "id": "approver",                 // stable, lowercase; used in seed file names and comments
      "name": "Alex Reyes",
      "role": "Manager · Sales",        // shown in the switcher and on comments
      "email": "alex@demo.wf",
      "tagline": "Manager with a full approval queue",
      "why": "Has nine items waiting and a team of six. Use for bulk approve and reject with reason.",
      "tests": ["Bulk approve", "Reject with reason", "Over-policy flags"],
      "stats": { "Pending": 9, "Team": 6, "Over policy": 2 },
      "flags": { "Plan": "Pro", "Role": "Approver", "Delegate": "None" },
      "seed": "seed/approver.json",     // defaults to seed/<id>.json
      "plan": "pro",                    // any extra fields reach screens as wf.user.*
      "permissions": ["submit", "approve"],
      "addedIn": "v1",
      "addedBecause": "initial cast"
    }
  ]
}
```
`stats` and `flags` are display-only (label → value). Put the fields that screens branch on (`plan`, `permissions`, `limits`, `team`…) as top-level fields.

## seed/<id>.json
```json
{ "data": {
  "expenses": [ { "id": "exp_1", "merchant": "Coastline Rail", "amount": 184.2, "status": "pending", "by": "Sam Okafor", "date": "2026-11-21" } ],
  "team": [ … ],
  "settings": { "currency": "EUR" }
} }
```
`seed/shared.json` has the same shape and is merged under every user's own data. Use it for catalogue or reference data everyone sees.

When a seed file changes, each browser drops that user's cached data and reloads the new seed. "Reset this user's data" in the toolbar does the same by hand.

## Revising the cast (every iteration)
After each change, check:
1. Does the change add a role, plan, limit, state or permission? Then add a user (or extend one) who shows it. Set `addedIn` and `addedBecause`.
2. Did a user stop being distinct, or does their `why` no longer hold? Merge or remove them, and say so.
3. Are `stats`, `tests` and `why` still true for every user?
4. Does every screen have at least one user that shows its empty state, and one that shows its busiest state?

Record cast changes in WIREFRAME.md ("Seeded users" and the changelog) and mention them to the person in one line.
