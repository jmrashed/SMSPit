# FAQ

## What is SMSPit?

A self-hosted SMS *sandbox* — a tool you run yourself, locally or in CI, that captures outgoing SMS messages your application sends instead of delivering them to a real phone. Inspired by tools like Mailpit/MailHog for email.

## Is SMSPit a real SMS provider?

No. It never sends a real SMS to a mobile network, and it has no relationship with mobile carriers. It exists specifically so you *don't* need a real provider during development and testing.

## Does SMSPit send real SMS?

No — never. Every message SMSPit "sends" is actually just captured and stored. This is the entire point: point your app at SMSPit instead of Twilio/Vonage/etc. during development, and no real SMS goes out, no matter how many times you test.

## How does SMS capture work?

Your application calls SMSPit's REST API (`POST /api/v1/messages`) the same way it would call a real provider's API. SMSPit validates the request, persists the message, runs it through [AI enrichment](ai-service.md) (OTP detection, classification, spam scoring), and makes it immediately visible in the dashboard and searchable via the API.

## How does replay work?

`POST /api/v1/messages/{id}/replay` re-runs an existing message's original `to`/`from`/body through the same capture pipeline again, creating a **new** message row with `replayed_from` pointing at the original. It's not a re-delivery of the same message — useful for re-triggering whatever your application does in response to an inbound-looking event, without re-sending from your app.

## How does provider emulation work?

If your application already integrates with a real SMS provider's SDK (MessageBird, Vonage, AWS SNS), you can point that *same* SDK at your SMSPit instance by swapping only its base URL — SMSPit exposes endpoints shaped exactly like each real provider's send API. See [Provider Compatibility](api/provider-compatibility.md).

## How does multi-tenancy work?

Every API key is either bound to one organization or to none ("ungrouped"). All data a key can see (messages, templates, statistics) is scoped to its own organization — never a wildcard across organizations. See [Multi-tenancy](multi-tenancy.md).

## Is an internet connection required?

No — SMSPit is designed to run entirely locally (Docker Compose or standalone processes) with no outbound calls to the internet required for its core capture/search/replay functionality. The one exception: if you configure a real provider-compatible adapter's *real* credentials for some other purpose, that's your own integration, not something SMSPit itself needs.

## How do I use SMSPit in local development?

See [Getting Started](getting-started.md) for the full walkthrough: clone, install, configure, run, capture your first message, view it in the dashboard.

## How do I use it in CI/CD?

Run the stack (via `docker-compose.yml` or `scripts/dev-up.sh`) as part of your test job, point your application under test at SMSPit's gateway URL, and assert against captured messages via the REST API instead of needing a real provider sandbox/credentials in CI. See [Testing](testing.md) for how SMSPit's own CI does this for its own test suites (a similar pattern applies to using SMSPit as a dependency in *your* CI).

## How do I configure a real provider?

You don't — SMSPit isn't a router to real providers. If you mean "how do I make my app that currently uses SMSPit talk to a real provider in production," that's a matter of pointing your application's SDK back at the real provider's base URL (reversing the swap described in [Provider Compatibility](api/provider-compatibility.md)) — SMSPit itself has no forwarding/passthrough mode.

## What is the difference between capture and delivery?

**Delivery** is what a real SMS provider does: hands your message to a mobile carrier, which attempts to get it onto a real phone. **Capture** is what SMSPit does instead: records the message (with all its metadata) so you can inspect, search, and replay it — without ever attempting delivery. SMSPit has no delivery mechanism at all.
