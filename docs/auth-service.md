# auth-service

Authentication and access control — users, API keys, organizations, and teams.

## Stack

| Layer | Technology |
|---|---|
| Language/Framework | PHP / Laravel |
| Database | PostgreSQL |
| Deployment | Docker, Kubernetes |

## Status

Not yet implemented. Planned across v0.2 (auth, API keys) and v0.3 (organizations, teams) — see [checklist.md](../checklist.md) Days 31–36, 56–60.

## Responsibilities

- Own the `users`, `api_keys`, `organizations`, and `teams` data models
- Generate, validate, and revoke API keys
- Enforce organization/team membership and permissions
- Serve as the source of truth for identity, consumed by the gateway and other services

## Planned Features & Functionality

| Feature | Description |
|---|---|
| API key generation | `POST /api-keys` — generates a secure key, returns the plaintext value once |
| API key validation | Validates `Authorization` header on incoming requests; returns 401 on failure |
| API key revocation | Invalidate a key without deleting its usage history |
| Organizations CRUD | Create/list/update/delete organizations; only org admins can modify |
| Teams CRUD | Create/list teams within an org; add/remove members |
| Multi-tenant scoping | Every API key and user is bound to an organization |

## Directory layout (planned)

```
auth-service/
├── app/
│   ├── Http/Controllers/
│   ├── Models/
│   └── Services/
├── routes/
├── database/migrations/
├── tests/
├── Dockerfile
└── composer.json
```

## Depends on

- PostgreSQL (own schema: `users`, `api_keys`, `organizations`, `teams`)

## Depended on by

- `gateway` (API key validation)
- `sms-service` (org/team scoping of messages and keys)
