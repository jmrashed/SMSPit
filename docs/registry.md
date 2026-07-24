# Container registry (Day 96)

## Registry choice

**GHCR (`ghcr.io/jmrashed/smspit-*`)** — decided in Day 95, not a separate choice here. GHCR was picked over Docker Hub because it needs zero extra secrets: the `publish-images` job in [.github/workflows/ci.yml](../.github/workflows/ci.yml) authenticates with the workflow's own `GITHUB_TOKEN`, whereas Docker Hub would need a separate account and access token stored as repo secrets for no real benefit at this project's scale.

## Image naming

One image per service, all six built from their existing (already-verified, Days 26/27/48/79) Dockerfiles:

| Service | Image |
|---|---|
| `gateway/` | `ghcr.io/jmrashed/smspit-gateway` |
| `auth-service/` | `ghcr.io/jmrashed/smspit-auth-service` |
| `sms-service/` | `ghcr.io/jmrashed/smspit-sms-service` |
| `ai-service/` | `ghcr.io/jmrashed/smspit-ai-service` |
| `worker/` | `ghcr.io/jmrashed/smspit-worker` |
| `dashboard/` | `ghcr.io/jmrashed/smspit-dashboard` |

Each is tagged both `:latest` and `:{tag}` (e.g. `:v0.4.0`) on every `v*` tag push.

## How publishing actually happens

There is no `docker`/`podman` binary in this working environment (consistent with every prior Docker-related checklist day — see Days 26/27/29/48/49/79/81/82), so images can't be built, pushed, or pulled locally here. The mechanism instead lives entirely in CI: the `publish-images` job (added Day 95) builds and pushes all six on every `v*` tag push, and only runs after every test job across all six services and all four SDKs passes.

**This means "publish the images" and "tag a release" are the same action** — pushing a version tag *is* what triggers a real publish, which is why it was deferred to Day 100 rather than done speculatively mid-checklist.

## Status: published (as of v1.0.2)

`v1.0.0` and `v1.0.1`'s tag pushes never actually reached `publish-images` — CI failed earlier in the pipeline both times (a `lint` failure for `v1.0.0`, found and fixed for `v1.0.1`; then a missing Redis service for `auth-service`/`worker` and a real coverage regression in `sms-service`, found and fixed for `v1.0.2`). `v1.0.2`'s tag push is the one that actually ran `publish-images` end-to-end: all 6 services built and pushed successfully, each returning a real content digest (confirmed in that run's logs). `v1.0.0`/`v1.0.1` remain tagged/released as historical points, not deleted.

## Verifying images pull and run correctly

```sh
docker pull ghcr.io/jmrashed/smspit-gateway:v1.0.2
docker run --rm -p 8080:8080 ghcr.io/jmrashed/smspit-gateway:v1.0.2
curl http://localhost:8080/healthz
```

Not run here — no Docker in this environment to pull/run locally. The publish itself (build, push, digest returned) is confirmed via the `v1.0.2` GitHub Actions run; pulling and running the published image is the one remaining unverified step, left for whoever has Docker available.
