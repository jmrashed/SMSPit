# auth-service

**Status: Implemented.** Authentication and access control — users, API keys, organizations, and teams. The sole owner of the shared PostgreSQL schema (see [Architecture: Database migrations](architecture.md#database-migrations)).

## Stack

| Layer | Technology |
|---|---|
| Language/Framework | PHP / Laravel |
| Database | PostgreSQL (schema owner for the whole platform) |
| Deployment | Docker, Kubernetes (see [Kubernetes](kubernetes.md) / [Helm](helm.md)) |

## Responsibilities

- Own the `users`, `api_keys`, `organizations`, `teams` data models and all migrations
- Generate, validate, rotate, and revoke API keys
- Enforce organization/team membership and admin-only permissions
- Serve as the source of truth for identity, consumed by the gateway and `sms-service`

## API

| Feature | Endpoint(s) | Auth |
|---|---|---|
| Create API key | `POST /auth/api-keys` | None — bootstraps the very first key |
| List API keys | `GET /auth/api-keys` | None (see [security.md](security.md#known-finding-unauthenticated-key-management) for why this is a known, accepted gap) |
| Revoke API key | `DELETE /auth/api-keys/{apiKey}` | None |
| Rotate API key | `POST /auth/api-keys/{apiKey}/rotate` | None — see [API Key Rotation](api-key-rotation.md) |
| Validate API key | `GET /auth/api-keys/validate` | Bearer key (used internally by the gateway and sms-service) |
| Organizations CRUD | `GET/POST/PUT/DELETE /auth/organizations[/{id}]` | Bearer key; admin-only for update/delete |
| Teams CRUD + membership | `GET/POST /auth/organizations/{id}/teams`, `POST/DELETE .../members[/{user}]` | Bearer key; admin-only |

Full request/response schemas: [OpenAPI Reference](openapi/site/index.html). Conceptual overview: [Organizations and Teams](organizations-and-teams.md).

## Configuration

| Env var | Purpose |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection (shared instance, this service's own schema) |
| `REDIS_HOST`, `REDIS_PORT` | Backs the Prometheus metrics storage adapter — required for this service's own tests to pass, not just at runtime |

See [.env.example](https://github.com/jmrashed/SMSPit/blob/main/auth-service/.env.example) for the full list.

## Directory layout

```
auth-service/
├── app/
│   ├── Http/Controllers/
│   ├── Http/Requests/    # FormRequest validation
│   ├── Models/
│   └── Policies/         # OrganizationPolicy (admin-only checks)
├── routes/
├── database/migrations/
├── tests/
├── Dockerfile
└── composer.json
```

## Testing

```sh
cd auth-service
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --force   # needs a real Postgres; Redis also required (see above)
php artisan test
```

See [Testing](testing.md) for the full-repo picture and how CI runs this.

## Related documentation

- [Architecture Overview](architecture.md)
- [Security](security.md) — API key model, rotation, secrets management decision
- [API Key Rotation](api-key-rotation.md)
- [Multi-tenancy](multi-tenancy.md) — organization scoping enforced here
- [Organizations and Teams](organizations-and-teams.md)
- [Observability](observability.md)
- [OpenAPI Reference](openapi/site/index.html)

## Depended on by

- `gateway` (API key validation on every `/api/v1/*` request)
- `sms-service` (org/team scoping of messages, templates, and keys)
