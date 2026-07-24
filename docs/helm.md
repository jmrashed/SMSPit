> Mirrored from [`deployments/helm/smspit/`](https://github.com/jmrashed/SMSPit/tree/main/deployments/helm/smspit/) in the main repo — relative links/paths below refer to that location, not this docs site.

# smspit Helm chart

Parameterized version of [`deployments/k8s/`](../../k8s/)'s raw manifests — same 8-service topology (`gateway`, `auth-service`, `sms-service`, `ai-service`, `worker`, `dashboard`, `postgres`, `redis`), namespaced under `smspit` by default.

**Status:** chart structure complete (Day 82), validated with `helm lint` (0 failures) and `helm template` (renders all 19 resources — 8 Deployments, 7 Services, 1 ConfigMap, 1 Secret, 1 PVC, 1 Namespace — matching `deployments/k8s/` 1:1), including with `--set` overrides for replica counts/images/resources. **Not yet run against a real cluster** — this sandbox has neither `kubectl`/a live cluster (see [deployments/k8s/README.md](../../k8s/README.md#status)) nor Docker/Podman (required by both `kind` and `minikube` as their node runtime), so `helm install --dry-run` fails immediately with "Kubernetes cluster unreachable" (it queries live cluster capabilities even in dry-run mode, unlike `helm template`'s pure client-side render). **Run `helm install smspit deployments/helm/smspit --dry-run` against a real `kind`/`minikube` cluster before trusting this.**

## Install

```bash
# Build/load images into your cluster first -- see deployments/k8s/README.md#images
helm install smspit deployments/helm/smspit \
  --set secrets.postgresPassword=<your-password> \
  --set secrets.dashboardApiKey=<your-key>
```

Or with a values override file (recommended for anything beyond a quick local test):

```bash
helm install smspit deployments/helm/smspit -f my-values.yaml
```

## Parameterized values

See [`values.yaml`](values.yaml) for the full list. Per service: `replicaCount`, `image.{repository,tag,pullPolicy}`, `resources.{requests,limits}`. `gateway`/`dashboard` additionally have `service.type` (default `LoadBalancer`). `postgres.storage` sizes the PVC. `dashboard.externalUrls` and `authServiceAppUrl` need to point at your cluster's actual externally-reachable hostnames (ingress/LoadBalancer) before this is useful beyond a single-machine port-forward setup.

`secrets.postgresPassword`/`secrets.dashboardApiKey` are placeholders in `values.yaml` — always override them (`--set` or a values file kept out of git), never rely on the checked-in defaults.

## Verify

```bash
helm lint deployments/helm/smspit
helm template smspit deployments/helm/smspit | less   # review the rendered manifests
```
