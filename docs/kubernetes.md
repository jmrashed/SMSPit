> Mirrored from [`deployments/k8s/`](https://github.com/jmrashed/SMSPit/tree/main/deployments/k8s) in the main repo — that's the source of truth; update there and re-sync this page.

# Kubernetes manifests

Plain manifests for running SMSPit on a cluster. Mirrors `docker-compose.yml`'s service topology: `gateway`, `auth-service`, `sms-service`, `ai-service`, `worker`, `dashboard`, `postgres`, `redis`, all in the `smspit` namespace.

**Status:** written and structurally validated, not yet applied to a real cluster — `kubectl` wasn't available in the environment this was built in (same constraint noted for `docker compose up` in the [Changelog](changelog.md#known-gaps)); a downloaded `kubectl` binary also failed to run in this sandbox (segfaulted, likely a sandbox syscall restriction). Manifests were validated by parsing every document with PyYAML and checking each has a well-formed `apiVersion`/`kind`/`metadata.name` — **run `kubectl apply --dry-run=client -f deployments/k8s/` for real before trusting this against an actual cluster.** `helm install` against a local `kind`/`minikube` cluster will be the first real end-to-end test.

## Images

`image: ghcr.io/jmrashed/smspit-<service>:latest`, `imagePullPolicy: IfNotPresent` — pulls the published images (see [Container Registry](registry.md)) by default. For a local `kind`/`minikube` cluster without registry access, build and `kind load docker-image`/`minikube image load` your own build instead, and update the image references before applying.

## Apply order

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml -f secret.yaml
kubectl apply -f postgres.yaml -f redis.yaml
kubectl apply -f auth-service.yaml -f sms-service.yaml -f ai-service.yaml -f worker.yaml -f gateway.yaml -f dashboard.yaml
```

(Or just `kubectl apply -f deployments/k8s/` — Kubernetes retries dependent resources until they succeed, but applying in the order above avoids the retry noise.)

## Before applying to anything real

- Edit `secret.yaml` — the checked-in values are placeholders (`changeme`, empty `DASHBOARD_API_KEY`). Prefer `kubectl create secret generic smspit-secrets --from-literal=...` (or a real secrets manager) over committing real values.
- Edit `configmap.yaml`'s `VITE_*` and `APP_URL` entries to your cluster's actual externally-reachable hostnames (ingress/LoadBalancer) — they're browser-facing URLs, not ClusterIP DNS names, so `localhost` placeholders only work when port-forwarding to a single machine.
- `gateway` and `dashboard` are `type: LoadBalancer`; switch to `NodePort` or add an `Ingress` if your cluster doesn't provision LoadBalancers (e.g. plain `kind`).

## Not yet included

- `Ingress` / TLS — no hostname/cert strategy chosen yet.
- `HorizontalPodAutoscaler`, `NetworkPolicy`, `PodDisruptionBudget` — deferred; replica counts and resource limits get parameterized via the [Helm chart](helm.md), and hardening is a planned follow-up (see [Security](security.md)).
- `worker` and the app services replicate to `replicas: 1` — bumping this is safe for the stateless services (`gateway`, `sms-service`, `ai-service`, `worker`, `dashboard`); `auth-service`'s `SESSION_DRIVER`/`QUEUE_CONNECTION`/`CACHE_STORE` are already `database`-backed so it's safe too. `postgres` must stay at 1 (single `ReadWriteOnce` volume, `strategy: Recreate`).

## Related documentation

- [Helm Chart](helm.md) — parameterized version of these same manifests
- [Production Deployment Guide](production-deployment.md)
- [Container Registry](registry.md)
