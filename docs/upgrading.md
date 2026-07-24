# Upgrading

## Current version

**v1.0.2** is the current release with a fully verified CI/CD pipeline. `v1.0.0` and `v1.0.1` are also tagged and released (kept as historical points, not removed) but their tag pushes never completed a successful image publish — see [CHANGELOG.md](changelog.md) for why. If you're deploying from a tag rather than `main`, use `v1.0.2` or later.

## No breaking changes yet

There have been no breaking API or schema changes across v0.1 → v1.0.2 — every release so far has been purely additive (new endpoints, new fields, new services), and [CHANGELOG.md](changelog.md) documents each release's actual changes in full. There is currently no dedicated "migrating from vX to vY" procedure because nothing has required one: upgrading has meant "deploy the new version" with no data migration, config rename, or removed endpoint to account for.

This page will be filled in with real steps the first time a release actually introduces a breaking change — not before.

## Database migrations

`auth-service` owns all schema migrations (see [Architecture: Database migrations](architecture.md#database-migrations)) and runs them via `php artisan migrate`. Every migration added since v0.1 has been additive (new tables, new nullable columns) — none has required a backfill or a breaking rename. Run `php artisan migrate --force` as part of any deploy, same as always; see [Production Deployment](production-deployment.md).

## API compatibility

The REST API has grown fields and endpoints across every release but has not removed or renamed anything from a prior release. The [OpenAPI Reference](openapi/site/index.html) reflects the exact current contract; there is no versioned API (no `/v2`) to migrate between yet.

## Configuration changes

New environment variables have been added release over release (e.g. `RATE_LIMIT_PER_MINUTE` for the gateway's rate limiter, `AI_SERVICE_URL` when `ai-service` was introduced) — each defaults to sensible behavior if unset (see the [environment variable reference](production-deployment.md#environment-variable-reference)), so simply not setting a new variable has never been a breaking change; it just means you don't get that release's new behavior configured.

## Related documentation

- [Changelog](changelog.md) — the actual version-by-version record
- [Production Deployment](production-deployment.md)
