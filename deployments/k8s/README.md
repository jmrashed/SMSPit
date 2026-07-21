# Kubernetes manifests

Plain manifests for running SMSPit on a cluster (Day 81). Mirrors `docker-compose.yml`'s service topology: `gateway`, `auth-service`, `sms-service`, `ai-service`, `worker`, `dashboard`, `postgres`, `redis`, all in the `smspit` namespace.

**Status:** written and structurally validated, not yet applied to a real cluster — `kubectl` wasn't available in the environment this was built in (same constraint noted for `docker compose up` in [CHANGELOG.md](../../CHANGELOG.md#known-gaps)); a downloaded `kubectl` binary also failed to run in this sandbox (segfaulted, likely a sandbox syscall restriction). Manifests were validated by parsing every document with PyYAML and checking each has a well-formed `apiVersion`/`kind`/`metadata.name` — **run `kubectl apply --dry-run=client -f deployments/k8s/` for real before trusting this against an actual cluster.** `helm install` against a local `kind`/`minikube` cluster (Day 82) will be the first real end-to-end test.

## Images

`image: smspit/<service>:latest` placeholders, `imagePullPolicy: IfNotPresent` — build and load them into your cluster first (e.g. `kind load docker-image smspit/gateway:latest`), or push to a registry and update the image references, before applying.

## Apply order

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml -f secret.yaml
kubectl apply -f postgres.yaml -f redis.yaml
kubectl apply -f auth-service.yaml -f sms-service.yaml -f ai-service.yaml -f worker.yaml -f gateway.yaml -f dashboard.yaml
```

(Or just `kubectl apply -f deployments/k8s/` — Kubernetes retries dependent resources until they succeed, but applying in the order above avoids the retry noise.)

## Before applying to anything real

- Edit `secret.yaml` — the checked-in values are placeholders (`changeme`, empty `DASHBOARD_API_KEY`). Prefer `kubectl create secret generic smspit-secrets --from-literal=...` (or a real secrets manager, see `checklist.md` Day 87) over committing real values.
- Edit `configmap.yaml`'s `VITE_*` and `APP_URL` entries to your cluster's actual externally-reachable hostnames (ingress/LoadBalancer) — they're browser-facing URLs, not ClusterIP DNS names, so `localhost` placeholders only work when port-forwarding to a single machine.
- `gateway` and `dashboard` are `type: LoadBalancer`; switch to `NodePort` or add an `Ingress` if your cluster doesn't provision LoadBalancers (e.g. plain `kind`).

## Not yet included

- `Ingress` / TLS — no hostname/cert strategy chosen yet.
- `HorizontalPodAutoscaler`, `NetworkPolicy`, `PodDisruptionBudget` — deferred; replica counts and resource limits get parameterized via the Helm chart (Day 82), and hardening lands Day 87.
- `worker` and the app services replicate to `replicas: 1` — bumping this is safe for the stateless services (`gateway`, `sms-service`, `ai-service`, `worker`, `dashboard`); `auth-service`'s `SESSION_DRIVER`/`QUEUE_CONNECTION`/`CACHE_STORE` are already `database`-backed so it's safe too. `postgres` must stay at 1 (single `ReadWriteOnce` volume, `strategy: Recreate`).
