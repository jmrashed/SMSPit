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

**This means "publish the images" and "tag a release" are the same action** — pushing a version tag *is* what triggers a real publish. That's a visible, hard-to-reverse action against the actual GitHub repository and its package registry (creates public GHCR packages under the account), so it isn't something to do speculatively while working through the rest of the checklist. It happens for real at Day 100 (tag and release v1.0), when the user confirms they want that tag pushed.

## Verifying images pull and run correctly

Deferred to the same point: once `publish-images` has actually run against a real tag push, "pull and run" is verified by:

```sh
docker pull ghcr.io/jmrashed/smspit-gateway:v1.0.0
docker run --rm -p 8080:8080 ghcr.io/jmrashed/smspit-gateway:v1.0.0
curl http://localhost:8080/healthz
```

Not run here for the same reason as above (no Docker in this environment, and no tag has been pushed yet to have produced an image to pull).
