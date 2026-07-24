# Multi-tenant data model

Design for organizations/teams. Read [architecture.md](architecture.md#database-migrations) first — this doc assumes the same centralized-migration decision (auth-service owns all schema).

## Entities and relationships

```
User ──*   organization_user (role: admin | member)   *── Organization ──* Team ──* team_user *── User
                                                              │
                                                              ├──* ApiKey   (org_id)
                                                              └──* Message  (org_id)
```

- **Organization** is the top-level tenant boundary. All data scoping happens at this level, not the team level.
- **User ↔ Organization** is many-to-many through `organization_user`, carrying a `role` (`admin` | `member`). A user can belong to multiple organizations (e.g. a contractor working across clients); an organization has zero or more admins, who can manage the org and its teams.
- **Team** belongs to exactly one `Organization` (`teams.organization_id`, not nullable) — teams don't span organizations.
- **User ↔ Team** is many-to-many through `team_user`. Teams are a grouping/UI concept for organizing people within an org (e.g. "Engineering", "Support"); they carry no additional data-scoping role of their own. A team's members are expected to also be members of the team's organization — this is an application-level invariant (enforced when adding a member), not a database constraint, since Postgres has no clean way to express "these two FKs' implied memberships must overlap" without a trigger, which is more machinery than this invariant is worth.
- **ApiKey** and **Message** carry a nullable `org_id`, added in a later migration than the `organizations`/`teams` tables themselves — scoping existing tables was its own step, with its own backfill/query-filtering concerns. This doc only covers the `organizations`/`teams` schema itself.

## Why a role on the pivot, not a separate `admins` table

`organization_user.role` keeps membership and permission in one row — a user is either not in the org (no row), a member (row, `role = member`), or an admin (row, `role = admin`). A separate table would let a user be an "admin" without being a "member," which isn't a meaningful state here.

## Why `organization_id` is not nullable on `teams` but is nullable on `messages`/`api_keys`

A team is created *within* an organization — there's no scenario where a team without one is meaningful, so the migration enforces it. `messages` and `api_keys` predate multi-tenancy (data exists with no organization from before it was added), so their `org_id` has to tolerate `NULL` for pre-existing rows rather than forcing a synthetic backfill organization nobody asked for.

## Tables

```
organizations
  id            bigint PK
  name          string
  slug          string, unique
  timestamps

organization_user
  id                bigint PK
  organization_id   bigint FK -> organizations.id, cascade delete
  user_id           bigint FK -> users.id, cascade delete
  role              string, enum('admin','member'), default 'member'
  timestamps
  unique(organization_id, user_id)

teams
  id                bigint PK
  organization_id   bigint FK -> organizations.id, cascade delete
  name              string
  timestamps

team_user
  id        bigint PK
  team_id   bigint FK -> teams.id, cascade delete
  user_id   bigint FK -> users.id, cascade delete
  timestamps
  unique(team_id, user_id)
```

Cascade delete on the org/team foreign keys: deleting an organization removes its membership and team rows (and, transitively, team membership) rather than leaving orphans — there's no soft-delete/audit requirement on membership itself (unlike `api_keys.revoked_at`, which exists because *keys* need an audit trail; who was in an org at some past point does not, for this tool's scope).

See [Organizations and Teams](organizations-and-teams.md) for the user-facing workflow (switching orgs, inviting members).

## Hardening audit

Every org-scoped query and endpoint was audited for missing scoping or IDOR risk:

- **sms-service** (`messages`, `templates`, `statistics`, WebSocket broadcasts): every repository/service method filters through the shared `orgWhere`/`buildFilterWhere` helpers, correctly treating a `NULL` org as `IsNull()` rather than `= NULL`. No controller fetches an entity by bare `:id` without first routing through the org-scoped `findOne`, so there are no IDOR gaps.
- **auth-service** (`organizations`, `teams`): both controllers authorize via `OrganizationPolicy` (membership for read, admin role for mutation) plus an explicit `ensureTeamBelongsToOrganization` check, so a valid but cross-org team/org id 404s instead of leaking data.
- **Provider adapters** (`providers/messagebird`, `providers/sns`, `providers/vonage`) intentionally accept unauthenticated third-party-shaped webhooks and persist with `org_id = null` — see [Provider Compatibility](api/provider-compatibility.md). This is a deliberate compatibility decision, not a scoping gap.
- **Test coverage**: `sms-service/test/multi-tenancy.e2e-spec.ts` and `auth-service/tests/Feature/{OrganizationTest,TeamTest}.php` cover cross-org isolation (list/detail/replay/update/delete all 404 or empty across org boundaries).

The one real gap found: **no rate limiting existed anywhere in the stack.** See [Rate Limiting](rate-limiting.md) for the fix (a per-tenant limiter at the gateway) and full configuration detail.
