# dashboard

**Status: Implemented.** The web UI for SMSPit — inbox, search, replay, statistics, and live updates.

![SMSPit dashboard inbox](/assets/screenshot-inbox.png)

## Stack

| Layer | Technology |
|---|---|
| Framework | React (Vite) |
| Real-time | WebSocket client — see [WebSocket API](websocket.md) |
| Deployment | Docker (static build served via its own Dockerfile) |

## Responsibilities

- Render captured messages in a searchable, filterable inbox
- Provide message detail, replay, and export actions
- Surface statistics and AI-derived tags (OTP, classification, spam)
- Manage API keys (create/rotate/revoke) and organization/team context
- Reflect new captures in real time via WebSocket

## Features

| Feature | Description |
|---|---|
| Inbox | List view with status/category/spam badges, real-time updates over WebSocket |
| Message detail | Full message + metadata, replay button |
| Search & filters | By `to`, `from`, category, spam status, date range |
| Replay | Re-captures a message's original payload as a new, linked message |
| Statistics | Overview page with metric cards and a message-volume chart |
| API key management | List/create/rotate/revoke keys, copy-to-clipboard for a newly created key — see [API Key Rotation](api-key-rotation.md) |
| Organization/team switcher | Scopes the dashboard to the active organization — see [Organizations and Teams](organizations-and-teams.md) |
| Message templates | Create/edit/select reusable `{{variable}}` templates — see [Templates](templates.md) |
| Export | Download messages as CSV/JSON — see [Export](export.md) |
| AI tags | OTP highlight with copy-to-clipboard, classification badge, spam flag with a manual "mark as not spam" override |
| Generate test data | Button to synthesize sample messages via `ai-service` for exercising the UI — see [Generate Test Data](generate-test-data.md) |

## Configuration

| Env var | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Gateway URL the dashboard talks to |
| `VITE_AUTH_SERVICE_URL` | auth-service URL (org/team/key management calls) |
| `VITE_API_KEY` | Bootstrap API key for local dev (see [Getting Started](getting-started.md)) |

## Directory layout

```
dashboard/
├── src/
│   ├── components/
│   ├── pages/         # Inbox, MessageDetail, Statistics, ApiKeys, Organizations
│   ├── hooks/
│   ├── context/         # OrgContext (active organization)
│   ├── api/               # REST client
│   └── App.tsx
├── public/
├── Dockerfile
└── package.json
```

## Testing

```sh
cd dashboard
npm ci
npm run lint
npm run build
```

There is no dashboard unit/component test suite at the time of writing — `lint` + `build` are what CI enforces. See [Testing](testing.md).

## Related documentation

- [Getting Started](getting-started.md) — first-run walkthrough that exercises this UI end to end
- [WebSocket API](websocket.md)
- [Organizations and Teams](organizations-and-teams.md)
- [API Key Rotation](api-key-rotation.md)
- [Templates](templates.md)
- [Export](export.md)

## Depends on

- [sms-service](sms-service.md) (REST API, WebSocket)
- [auth-service](auth-service.md) (API key and organization/team management endpoints)
