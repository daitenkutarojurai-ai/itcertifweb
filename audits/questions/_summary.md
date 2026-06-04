# Question-bank audit

Generated: 2026-06-04T07:07:20.154Z
Packs scanned: **84** · questions: **3214**

- **Structural issues: 0** (0.0%) — recall-only stems + under-tagged. Reliable, no false positives, fix these first.
- Heuristic tells: lengthTell 250, keywordTell 678 — review hints only.
- Any-signal flagged: 789 (24.5%).

## Methodology

4 signals per question (TODO.md "Rewrite all 2,520 questions"). Split into
**structural** (reliable, directly actionable) and **heuristic tells**
(useful hints, but they still carry false positives on well-written scenario
questions — the correct answer to a precise question is often legitimately the
longest, and a scenario legitimately shares distinctive vocabulary with its
answer, so do NOT auto-"fix" a tell without reading the question):

| Signal | Kind | Hit when… |
|---|---|---|
| `recallOnly`  | structural | stem has < 18 words (tests recall, not scenario reasoning) |
| `underTagged` | structural | question has < 2 tags (no domain × sub-topic) |
| `lengthTell`  | heuristic  | correct option is the longest AND > 1.15× the mean option length |
| `keywordTell` | heuristic  | correct option echoes a DISTINCTIVE stem word (low pack document-frequency, non-numeric) that no distractor uses |

## Pack ranking (worst-first by structural issues)

| Pack | Total | Struct | length | keyword | recall | tags |
|---|---:|---:|---:|---:|---:|---:|
| `ms-102` | 12 | 0 | 10 | 7 | 0 | 0 |
| `pl-400` | 12 | 0 | 11 | 7 | 0 | 0 |
| `dp-600` | 12 | 0 | 7 | 4 | 0 | 0 |
| `f5-201-tmos` | 12 | 0 | 8 | 5 | 0 | 0 |
| `gcp-pmle` | 12 | 0 | 9 | 7 | 0 | 0 |
| `aws-clf-c02` | 98 | 0 | 10 | 74 | 0 | 0 |
| `ccnp-encor` | 40 | 0 | 29 | 31 | 0 | 0 |
| `comptia-server` | 12 | 0 | 7 | 5 | 0 | 0 |
| `okta-certified-professional` | 12 | 0 | 9 | 4 | 0 | 0 |
| `pcnse` | 12 | 0 | 7 | 6 | 0 | 0 |
| `aws-scs-c02` | 61 | 0 | 27 | 30 | 0 | 0 |
| `ccnp-security` | 60 | 0 | 0 | 41 | 0 | 0 |
| `comptia-cloud` | 12 | 0 | 7 | 3 | 0 | 0 |
| `devnet` | 12 | 0 | 5 | 6 | 0 | 0 |
| `dp-100` | 12 | 0 | 7 | 5 | 0 | 0 |
| `pl-600` | 12 | 0 | 6 | 4 | 0 | 0 |
| `ai-102` | 16 | 0 | 0 | 10 | 0 | 0 |
| `aws-dea-c01` | 16 | 0 | 0 | 10 | 0 | 0 |
| `kcna` | 16 | 0 | 1 | 9 | 0 | 0 |
| `consul-003` | 12 | 0 | 6 | 3 | 0 | 0 |
| `cyberops` | 12 | 0 | 5 | 3 | 0 | 0 |
| `dp-203` | 12 | 0 | 6 | 3 | 0 | 0 |
| `pccse-prisma-cloud` | 12 | 0 | 4 | 5 | 0 | 0 |
| `cloudflare-cass` | 16 | 0 | 0 | 9 | 0 | 0 |
| `gcp-pcse` | 16 | 0 | 5 | 8 | 0 | 0 |
| `aws-dva-c02` | 61 | 0 | 0 | 33 | 0 | 0 |
| `az-900` | 91 | 0 | 19 | 43 | 0 | 0 |
| `aws-mla-c01` | 16 | 0 | 1 | 7 | 0 | 0 |
| `az-140` | 12 | 0 | 2 | 5 | 0 | 0 |
| `dp-700` | 16 | 0 | 0 | 8 | 0 | 0 |
| `snowpro-core` | 16 | 0 | 1 | 7 | 0 | 0 |
| `aws-ans-c01` | 60 | 0 | 2 | 25 | 0 | 0 |
| `az-104` | 56 | 0 | 9 | 22 | 0 | 0 |
| `sc-100` | 16 | 0 | 1 | 7 | 0 | 0 |
| `az-801` | 12 | 0 | 3 | 4 | 0 | 0 |
| `oci-foundations` | 12 | 0 | 3 | 3 | 0 | 0 |
| `pl-900` | 12 | 0 | 5 | 2 | 0 | 0 |
| `az-400` | 16 | 0 | 0 | 6 | 0 | 0 |
| `ccsp` | 16 | 0 | 0 | 6 | 0 | 0 |
| `gcp-cdl` | 16 | 0 | 5 | 2 | 0 | 0 |
| `sc-200` | 16 | 0 | 0 | 6 | 0 | 0 |
| `az-800` | 12 | 0 | 3 | 3 | 0 | 0 |
| `aws-sap-c02` | 16 | 0 | 0 | 5 | 0 | 0 |
| `dp-900` | 16 | 0 | 1 | 5 | 0 | 0 |
| `ai-900` | 20 | 0 | 0 | 6 | 0 | 0 |
| `aws-dop-c02` | 16 | 0 | 0 | 4 | 0 | 0 |
| `gcp-pcne` | 16 | 0 | 2 | 2 | 0 | 0 |
| `github-actions` | 16 | 0 | 0 | 4 | 0 | 0 |
| `isc2-cc` | 16 | 0 | 0 | 4 | 0 | 0 |
| `kcsa` | 16 | 0 | 0 | 4 | 0 | 0 |
| `rhcsa` | 61 | 0 | 0 | 14 | 0 | 0 |
| `aws-aif-c01` | 20 | 0 | 1 | 3 | 0 | 0 |
| `ccnp` | 101 | 0 | 1 | 19 | 0 | 0 |
| `github-foundations` | 16 | 0 | 0 | 3 | 0 | 0 |
| `az-700` | 12 | 0 | 2 | 0 | 0 | 0 |
| `pl-300` | 12 | 0 | 2 | 0 | 0 | 0 |
| `gcp-pca` | 61 | 0 | 0 | 9 | 0 | 0 |
| `splunk-core` | 66 | 0 | 1 | 8 | 0 | 0 |
| `ccna` | 112 | 0 | 0 | 14 | 0 | 0 |
| `cissp` | 25 | 0 | 0 | 3 | 0 | 0 |
| `cka` | 61 | 0 | 0 | 7 | 0 | 0 |
| `comptia-a-plus` | 101 | 0 | 0 | 11 | 0 | 0 |
| `az-500` | 61 | 0 | 0 | 6 | 0 | 0 |
| `comptia-pentest` | 61 | 0 | 0 | 6 | 0 | 0 |
| `aws-saa-c03` | 60 | 0 | 0 | 5 | 0 | 0 |
| `az-305` | 61 | 0 | 0 | 5 | 0 | 0 |
| `vault-002` | 51 | 0 | 0 | 4 | 0 | 0 |
| `gcp-ace` | 56 | 0 | 0 | 3 | 0 | 0 |
| `gcp-pde` | 60 | 0 | 0 | 3 | 0 | 0 |
| `ckad` | 61 | 0 | 0 | 3 | 0 | 0 |
| `cks` | 61 | 0 | 0 | 3 | 0 | 0 |
| `docker-dca` | 61 | 0 | 0 | 3 | 0 | 0 |
| `nse4` | 61 | 0 | 0 | 3 | 0 | 0 |
| `comptia-cysa` | 66 | 0 | 0 | 3 | 0 | 0 |
| `comptia-network-plus` | 91 | 0 | 0 | 4 | 0 | 0 |
| `aws-soa-c02` | 60 | 0 | 0 | 2 | 0 | 0 |
| `servicenow-csa` | 61 | 0 | 0 | 2 | 0 | 0 |
| `comptia-security-plus` | 92 | 0 | 0 | 3 | 0 | 0 |
| `terraform-003` | 161 | 0 | 0 | 3 | 0 | 0 |
| `ms-900` | 60 | 0 | 0 | 1 | 0 | 0 |
| `sc-900` | 60 | 0 | 0 | 1 | 0 | 0 |
| `comptia-linux` | 61 | 0 | 0 | 1 | 0 | 0 |
| `pcnsa` | 61 | 0 | 0 | 1 | 0 | 0 |
| `az-204` | 20 | 0 | 0 | 0 | 0 | 0 |

## Per-pack CSVs

See `audits/questions/<packId>.csv` — sorted worst-to-best. Start at the top:
fix `recallOnly` / `underTagged` rows first (unambiguous), then sanity-check
the `lengthTell` / `keywordTell` hints by hand.
