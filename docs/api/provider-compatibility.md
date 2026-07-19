# Provider-compatible endpoints

Spec for v0.3's provider adapters (checklist Days 51–55). Read [message-mapping.md](message-mapping.md) first — this doc only covers what's specific to third-party compatibility; the native contract it describes is unchanged and final as of v0.3.

## Goal

An app already integrated with a real SMS provider's SDK should be able to point that SDK at SMSPit by overriding its base URL alone — no code change, no different request shape. Each adapter accepts that provider's actual wire format at that provider's actual relative path, translates it to an internal capture (`to`/`from`/`message`), and returns a response shaped closely enough to the real API that the SDK's own response parsing succeeds.

## URL path convention

`/providers/{provider}/{provider's own relative path}` — e.g. MessageBird's SDK calls `POST {baseUrl}/messages`, so pointed at SMSPit that becomes `POST /providers/messagebird/messages`.

This is a separate route tree from `/api/v1/*`, not a version of it:

- These payloads aren't SMSPit's own contract — nesting them under `/api/v1` would misrepresent them as part of the versioned native API.
- Each provider owns a different relative path shape (MessageBird: `/messages`; Vonage: `/sms/json`; SNS: a single root endpoint) — a shared prefix per provider keeps them from colliding with each other or with `/messages` (the native endpoint).
- `sms-service`'s global prefix (`app.setGlobalPrefix('api/v1')`) is excluded for `providers/*` so the path match is exact, not `/api/v1/providers/...`.

## Auth

Compatibility endpoints do **not** require an SMSPit API key. Real provider SDKs authenticate with that provider's own scheme (MessageBird: `Authorization: AccessKey ...`; Vonage: `api_key`/`api_secret` params; SNS: AWS SigV4 request signing) — requiring a *different* SMSPit-specific credential on top would break the "swap the base URL, nothing else" premise these endpoints exist for. None of those provider-specific credentials are verified either (this is a capture sandbox, not a provider — there's nothing to authenticate *to*). This is a deliberate tradeoff, consistent with SMSPit's local dev/test positioning: don't expose an instance publicly.

## Provider mappings

### MessageBird — `POST /providers/messagebird/messages`

Real endpoint: `POST https://rest.messagebird.com/messages`.

| MessageBird field | → internal | notes |
|---|---|---|
| `originator` | `from` | |
| `recipients` | `to` | MessageBird accepts a comma-separated string or an array; SMSPit takes the first recipient (capture is single-message, see [Unsupported](#unsupported)) |
| `body` | `message` | |

Response shape (subset of MessageBird's actual response the SDK's success path reads):

```json
{ "id": "<internal id>", "originator": "...", "recipients": { "totalCount": 1, "totalSentCount": 1, "items": [{ "recipient": "...", "status": "sent" }] }, "body": "...", "createdDatetime": "..." }
```

### Vonage (Nexmo classic SMS API) — `POST /providers/vonage/sms/json`

Real endpoint: `POST https://rest.nexmo.com/sms/json` (form-encoded or JSON body; SMSPit accepts either).

| Vonage field | → internal | notes |
|---|---|---|
| `from` | `from` | |
| `to` | `to` | |
| `text` | `message` | |
| `api_key`, `api_secret` | — | accepted but ignored (see [Auth](#auth)) |

Response shape:

```json
{ "message-count": "1", "messages": [{ "to": "...", "message-id": "<internal id>", "status": "0" }] }
```

`status: "0"` is Vonage's own code for success — SDKs branch on it, so it's the one field callers actually depend on beyond `message-id`.

### AWS SNS — `POST /providers/sns`

Real endpoint: an AWS SNS regional endpoint, AWS Query API (`Action=Publish`, form-encoded), SigV4-signed.

| SNS field | → internal | notes |
|---|---|---|
| `PhoneNumber` | `to` | direct-to-phone `Publish`; topic-based `Publish` (`TopicArn`) is [unsupported](#unsupported) |
| `Message` | `message` | |
| — | `from` | SNS has no per-message sender field (it's account-level `SMSSenderID`, set outside the `Publish` call) — SMSPit defaults `from` to `SMSPit` |

SigV4 signature headers are accepted but not verified. Response is XML (AWS's default, and what the SDK's XML parser expects — not the JSON envelope every other adapter uses):

```xml
<PublishResponse xmlns="http://sns.amazonaws.com/doc/2010-03-31/">
  <PublishResult><MessageId>...</MessageId></PublishResult>
  <ResponseMetadata><RequestId>...</RequestId></ResponseMetadata>
</PublishResponse>
```

## Unsupported

Explicitly out of scope for v0.3's adapters — a payload using these either 400s or degrades to the documented fallback, not a silent misread:

- **Bulk/multi-recipient sends** (MessageBird's array `recipients`, SNS topic `Publish`). SMSPit's capture model is one message per call; only the first recipient is captured, and this is called out in each adapter's own tests (Day 55).
- **Delivery receipts / webhooks** each provider offers for the *other* direction (status callbacks). SMSPit captures instead of delivering, so there's nothing to report status on.
- **Provider-specific auth verification.** Credentials are accepted syntactically (so requests aren't rejected for shape reasons) but never checked — see [Auth](#auth).
- **Non-SMS message types** (MessageBird/Vonage also support voice, WhatsApp, etc. via adjacent endpoints). Only the SMS-send endpoint of each provider is emulated.
