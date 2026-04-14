# CertQuests Update — 2026-04-14 (Session 2)

## Summary

Three tasks completed in this session:

---

## Task 1: New Certification — CKS (Certified Kubernetes Security Specialist)

**What was added:**
- `data/free/cks.json` — 60 scenario-based questions across all 6 CKS exam domains
- `data/index.json` — activated CKS pack (available: true, question_count: 60, accent: #326CE5)
- `certifications/linux-devops.html` — CKS tile changed from Coming Soon to Live; hero updated to "6 LIVE EXAMS", "740+ Questions"; description updated to include CKS; FAQ updated

**Question breakdown:**
| Domain | Weight | Questions |
|--------|--------|-----------|
| Cluster Setup | 10% | 6 |
| Cluster Hardening | 15% | 9 |
| System Hardening | 15% | 9 |
| Minimize Microservice Vulnerabilities | 20% | 12 |
| Supply Chain Security | 20% | 12 |
| Monitoring, Logging & Runtime Security | 20% | 12 |

Answer distribution: A=15, B=15, C=15, D=15 (perfectly balanced cyclic pattern)

Topics covered: NetworkPolicy, CIS benchmark, kube-bench, AppArmor, seccomp, Linux capabilities, RBAC least-privilege, service account token management, Pod Security Admission, OPA Gatekeeper, Secrets encryption at rest, RuntimeClass (gVisor/Kata), Trivy image scanning, SBOM, Cosign image signing, distroless images, multi-stage builds, kubesec, ImagePolicyWebhook, Falco rules/fields/macros, Kubernetes audit policy levels/stages/rule ordering, falcosidekick, immutable containers, crictl forensics.

---

## Task 2: Terraform Associate 003 — 10 New Questions

**What was added:**
- `data/free/terraform-003.json` — 10 new scenario-based questions appended (tf-151 to tf-160)
- Total questions: 150 → 160

**New topics (exam-focused, varied correct answers):**
1. `count` increment behavior — only new index created
2. `terraform import` — command syntax
3. `lifecycle { prevent_destroy = true }` — protect critical resources
4. Provider aliases passed to modules via `providers` meta-argument
5. `moved` blocks (Terraform 1.1+) — declarative address refactoring
6. `dynamic` blocks — variable nested block generation
7. `(known after apply)` — values computed at apply time
8. `terraform apply -replace=` — modern replacement for deprecated `terraform taint`
9. Terraform Cloud remote backend — plan runs in TFC, not locally
10. `for_each` key removal — only removes specific resource instance

Answer distribution: varied (A, B, C, D, A, B, C, D, A, B) — no bias

---

## Task 3: CKS Course Page

**What was created:**
- `learning/kubernetes-cks/index.html` — comprehensive 7-module CKS course page

**Course page features:**
- Top + mid + bottom Spotify podcast CTAs
- Top + bottom quiz CTAs linking to `/train.html?pack=cks`
- CKS exam snapshot table (format, duration, passing score, prerequisite, validity)
- 6 domain weight bars
- 3 concept callouts (Defense in Depth, PSA enforce/warn/audit, Falco vs Audit Logs)
- 6-week study plan with specific weekly goals
- Top 4 CKS exam mistakes box (DNS in NetworkPolicy, AppArmor node loading, audit rule order, Falco field names)
- CKS vs CKA comparison grid
- Related certs section (CKA, CKAD, AZ-500, SCS-C02)
- Full module content (7 modules, ~40 hours):
  1. CKS Overview & Kubernetes Security Architecture
  2. Cluster Setup: NetworkPolicy, TLS & API Hardening
  3. Cluster Hardening: RBAC, Service Accounts & Upgrades
  4. System Hardening: AppArmor, Seccomp & Linux Capabilities
  5. Microservice Vulnerabilities: SecurityContext, OPA & Secrets
  6. Supply Chain Security: Scanning, Signing & Admission Control
  7. Runtime Security: Falco, Audit Logs & Behavioral Analysis

**Other files updated:**
- `data/courses.json` — added `kubernetes-cks` entry (advanced, security category, 7 modules, 40h)
- `sitemap.xml` — added `https://certquests.com/learning/kubernetes-cks/`
- `CLAUDE.md` — added CKS and Terraform sections to certification catalog

---

## Files Changed

| File | Action |
|------|--------|
| `data/free/cks.json` | CREATED — 60 CKS questions |
| `data/index.json` | UPDATED — CKS: available=true, question_count=60 |
| `certifications/linux-devops.html` | UPDATED — CKS tile Live, hero 5→6 exams, FAQ updated |
| `data/free/terraform-003.json` | UPDATED — 10 new questions (tf-151–tf-160) |
| `learning/kubernetes-cks/index.html` | CREATED — full CKS course page |
| `data/courses.json` | UPDATED — added kubernetes-cks entry |
| `sitemap.xml` | UPDATED — added CKS course URL |
| `CLAUDE.md` | UPDATED — CKS catalog entry + Terraform new questions docs |
| `CHANGELOG-2026-04-14-session2.md` | CREATED — this file |
