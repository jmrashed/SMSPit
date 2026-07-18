# dashboard

The web UI for SMSPit — inbox, search, replay, statistics, and live updates.

## Stack

| Layer | Technology |
|---|---|
| Framework | React |
| Real-time | WebSocket client |
| Deployment | Docker (static build served via Dockerfile) |

## Status

Not yet implemented. Core inbox/search planned for v0.1, auth/replay/stats/live updates for v0.2, org/team/template/export UI for v0.3 — see [checklist.md](../checklist.md) Days 21–25, 42, 44, 46–47, 60, 62, 64.

## Responsibilities

- Render captured messages in a searchable, filterable inbox
- Provide message detail, replay, and export actions
- Surface statistics and AI-derived tags (OTP, classification, spam)
- Manage API keys and organization/team context
- Reflect new captures in real time via WebSocket

## Planned Features & Functionality

| Feature | Description |
|---|---|
| Inbox | List view with status badges, real-time updates |
| Message detail | Full message + metadata, raw request, headers |
| Search & filters | By `to`, `from`, date range |
| Replay | Re-trigger a captured message's delivery pipeline |
| Statistics | Overview page with volume/delivery metric cards and charts |
| API key management | List/create/revoke keys, copy-to-clipboard for new keys |
| Org/team switcher | Scope the dashboard to the active organization |
| Message templates | Create/select reusable templates |
| Export | Download messages as CSV/JSON |
| AI tags | OTP highlight, classification badge, spam flag with manual override |
| Timeline & API logs | Chronological view of request/message activity |

## Directory layout (planned)

```
dashboard/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── api/
│   └── App.tsx
├── public/
├── Dockerfile
└── package.json
```

## Depends on

- `sms-service` (REST API, WebSocket)
- `auth-service` (API key management endpoints)
