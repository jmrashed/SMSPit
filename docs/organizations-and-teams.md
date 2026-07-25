# Organizations and Teams

Multi-tenancy building blocks — see [Multi-tenancy](multi-tenancy.md) for the underlying data model and scoping rules; this page covers the user-facing workflow.

## Organizations

The top-level tenant boundary. Every API key either belongs to exactly one organization, or belongs to none (an "ungrouped" key — see [Multi-tenancy](multi-tenancy.md#why-organization_id-is-not-nullable-on-teams-but-is-nullable-on-messagesapi_keys)). All messages, templates, and statistics a key can see are scoped to its organization (or to the ungrouped bucket, if it has none) — organization membership is a partition, never a wildcard.

### Creating an organization

```
POST /auth/organizations
{"name": "Acme Inc"}
```

The creating user is automatically made an `admin` of the new organization. `slug` is auto-derived from `name` if omitted.

### Roles

| Role | Can do |
|---|---|
| `admin` | Everything a member can, plus update/delete the org, create teams, add/remove team members |
| `member` | View the org and its teams |

### Switching organizations

The [dashboard](dashboard.md) has an organization switcher in the header; switching updates which organization's messages/templates/statistics are shown and persists the choice to `localStorage`. There is no API-level "switch" — an API key is permanently bound to whichever organization it was created for (or none); "switching" in the dashboard just changes which of *your* organizations' data you're viewing, using whichever key is active for that org.

### Managing organizations from the dashboard

The [dashboard](dashboard.md)'s Organizations page has full CRUD, not just the switcher: create an org (also the empty-state's primary action if you belong to none yet), and — for `admin`s of the selected org — edit its name or delete it. Deleting requires typing the organization's name to confirm, since it cascades to the org's teams/API keys/messages.

## Teams

A grouping/UI concept for organizing people within an organization (e.g. "Engineering," "Support") — teams carry no additional data-scoping role of their own; scoping happens at the organization level only. The dashboard's Organizations page lets `admin`s create teams and add/remove members directly (`member`s see the team list read-only); there's no edit/delete for a team once created, in the dashboard or the API — see [auth-service](auth-service.md) if you need to rename one for now. Adding a member takes their numeric user ID, since there's no user directory/search endpoint yet to pick someone by name or email.

### Creating a team and inviting a member

```
POST /auth/organizations/{id}/teams
{"name": "Engineering"}
```

```
POST /auth/organizations/{id}/teams/{team}/members
{"user_id": 42}
```

Admin-only. The target user must already be a member of the **organization** before they can join one of its teams — a 422 if not. Removing a member (`DELETE .../members/{user}`) is idempotent.

## Permissions and API key scope

A key's `org_id` determines what it can see; it does not itself carry a role. Organization admin/member roles gate the *management* endpoints (create/update/delete org, manage teams) via the acting user (resolved from the key's `owner_id`) — not the key's scopes list, which is a separate, currently-unused-by-any-endpoint field reserved for future fine-grained permissions.

## Related documentation

- [Multi-tenancy](multi-tenancy.md) — schema and scoping rules
- [auth-service](auth-service.md) — the API surface
- [Dashboard](dashboard.md) — the switcher UI
