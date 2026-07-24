# SDKs

Four native SDKs wrap SMSPit's REST API for `send`/`list`/`get`/`replay`. Each lives in its own folder under `sdks/`, with no cross-SDK code sharing (same "keep services isolated" convention as the main services), and none pulls a third-party HTTP dependency:

| Language | Path | Package name | Built on |
|---|---|---|---|
| PHP | [sdks/php/](https://github.com/jmrashed/SMSPit/tree/main/sdks/php) | `smspit/sdk` | ext-curl |
| Go | [sdks/go/](https://github.com/jmrashed/SMSPit/tree/main/sdks/go) | `github.com/jmrashed/SMSPit/sdks/go` | `net/http` |
| Node.js | [sdks/nodejs/](https://github.com/jmrashed/SMSPit/tree/main/sdks/nodejs) | `@smspit/sdk` | global `fetch` |
| Python | [sdks/python/](https://github.com/jmrashed/SMSPit/tree/main/sdks/python) | `smspit` | `urllib` |

Each SDK's own README has full install/usage instructions and a runnable example. This page covers the flows common to all four.

## Publishing status

**Not yet published to any package registry** (Packagist, pkg.go.dev, npm, PyPI). Each SDK works today via a local path/editable install (see its README), which is enough for in-repo examples and for anyone cloning this repo to use immediately. Publishing needs registry accounts/credentials this environment doesn't have and is a deliberate, tracked follow-up, not an oversight. The Go SDK is the one exception in spirit: any Go project can already depend on it via `go get github.com/jmrashed/SMSPit/sdks/go` once this repo is public, since Go modules don't need a separate registry publish step -- it just isn't tagged with a version yet.

## Common flow: send, then replay

All four SDKs expose the same three calls for the core loop -- capture a message, look at it again later, and replay it (re-running the original payload as a new linked message):

```php
// PHP
$message = $client->send(to: '+8801700000000', from: 'SMSPit', message: 'Your OTP is 123456');
$client->replay($message->id);
```

```go
// Go
message, _ := client.Send("+8801700000000", "SMSPit", "Your OTP is 123456")
client.Replay(message.ID)
```

```ts
// Node.js
const message = await client.send('+8801700000000', 'SMSPit', 'Your OTP is 123456');
await client.replay(message.id);
```

```python
# Python
message = client.send(to="+8801700000000", from_="SMSPit", message="Your OTP is 123456")
client.replay(message.id)
```

## Common flow: paginated list

`list()` (or `List`/`list`, per language convention) takes the same filters everywhere -- `limit`/`offset` plus `to`/`from`/`created_after`/`created_before` -- and returns `{ messages, total, limit, offset }` so a caller can page through results. See [docs/api/message-mapping.md](api/message-mapping.md#list-pagination-limitoffset) for the full filter contract each SDK wraps.

## "Webhook" flow: pointing an existing provider SDK at SMSPit

SMSPit's own SDKs aren't the only way to talk to it. If an application already sends SMS through a real provider's SDK (MessageBird, Vonage, AWS SNS), it can point that *existing* SDK at a local SMSPit instance instead, with no code change -- see [Provider Compatibility](api/provider-compatibility.md) for the full adapter contract. That's the intended way to capture traffic from an app that isn't using one of these four SDKs directly: swap the provider SDK's base URL, not the calling code.

## Error handling

All four raise/throw a typed error carrying SMSPit's standard error envelope (`code`, `message`, `details`) on any non-2xx response, rather than a generic HTTP exception -- `ApiException` (PHP), `*APIError` (Go), `ApiError` (Node.js), `ApiError` (Python). Network-level failures (no response at all) raise a separate transport-level error instead, so callers can distinguish "SMSPit rejected the request" from "couldn't reach SMSPit."
