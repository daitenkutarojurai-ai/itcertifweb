# Changes — Kubernetes CKAD Launch (2026-04-13)

## Summary
Activated the CKAD (Certified Kubernetes Application Developer) certification pack with 60
original scenario-based practice questions, enhanced the existing 8-module course page with
Spotify and quiz CTAs, and updated all catalog and vendor pages accordingly.

---

## Files changed

### New files
| File | Description |
|------|-------------|
| `data/free/ckad.json` | 60 scenario-based MCQ questions, v1.0.0 |

### Modified files
| File | Change |
|------|--------|
| `data/index.json` | Activated `ckad` pack: `available: true`, `question_count: 60`, `accent: #326CE5` |
| `data/courses.json` | Updated `kubernetes-ckad` description with full topic coverage |
| `certifications/linux-devops.html` | CKAD tile → Live, hero → 5 live exams / 680+ questions, FAQ updated |
| `learning/kubernetes-ckad/index.html` | Added Spotify CTA (top), fixed quiz link to `?pack=ckad`, upgraded bottom CTA with quiz+Spotify buttons, added CSS |
| `sitemap.xml` | Added `/learning/kubernetes-ckad/` URL |
| `CLAUDE.md` | Added CKAD to catalog table and changelog section |

---

## Question pack details

**File:** `data/free/ckad.json`
**Questions:** 60
**Version:** 1.0.0
**Format:** 4-option MCQ, scenario-based, with explanations and tags
**Difficulty:** advanced — hands-on kubectl-oriented scenarios

### Domain coverage
| Domain | Weight | Questions |
|--------|--------|-----------|
| Application Design & Build | 20% | ~12 |
| Application Deployment | 20% | ~12 |
| Application Observability & Maintenance | 15% | ~9 |
| Application Environment, Config & Security | 25% | ~15 |
| Services & Networking | 20% | ~12 |

### Key topics covered
- **Design & Build:** Sidecar/ambassador/adapter multi-container patterns, init containers, Jobs (completions/parallelism/backoffLimit), CronJobs, DaemonSets, StatefulSets, PVCs, emptyDir volumes
- **Deployment:** Rolling updates (maxSurge/maxUnavailable), Helm (repo add/install/rollback/history), Kustomize overlays (`kubectl apply -k`), rollout history/undo/pause/resume, kubectl scale, kubectl set image
- **Observability:** Liveness/readiness/startup probes, initialDelaySeconds/periodSeconds, kubectl logs --previous, kubectl exec -it, OOMKilled diagnosis, kubectl rollout status, kubectl top, Metrics Server requirement
- **Environment/Config/Security:** ConfigMap envFrom vs volumeMount, Secret base64/secretKeyRef, ServiceAccount tokens, SecurityContext (runAsNonRoot/allowPrivilegeEscalation/readOnlyRootFilesystem), resource requests/limits/CPU throttling, LimitRange, RBAC Role/RoleBinding, kubectl explain, dry-run -o yaml, kubectl set env
- **Services & Networking:** ClusterIP/NodePort/LoadBalancer/ExternalName service types, Ingress path routing (Prefix vs Exact), Ingress controller requirement, NetworkPolicy (allow/deny/egress), DNS naming (`svc.namespace.svc.cluster.local`), port-forward, kubectl cp, TLS secrets

---

## Course page enhancements

**Path:** `/learning/kubernetes-ckad/`

Changes made to the pre-existing 8-module course page:
- Added top Spotify CTA banner (CKAD-specific copy)
- Fixed quiz CTA link: `/train.html` → `/train.html?pack=ckad`
- Upgraded bottom CTA: single button → dual buttons (Start CKAD Quiz + Listen on Spotify)
- Added CSS for: `mid-cta`, `mid-cta-icon`, `mid-cta-body`, `mid-cta-link`, `course-cta-link.spotify`, `cta-buttons`
- Added `60 practice questions` meta chip to the hero

---

## Website stats after this update
- **Linux & DevOps live exams:** 5 (Terraform, Vault, Docker DCA, CKA, CKAD)
- **Linux & DevOps questions:** 680+
- **Total live packs:** 24
- **Total courses:** 17 (kubernetes-ckad was already counted)
