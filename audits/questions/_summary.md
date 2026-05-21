# Question-bank audit

Generated: 2026-05-21T08:16:13.158Z
Packs scanned: **61** · questions scanned: **2812** · flagged: **1490** (53.0%)

## Methodology

4 signals per question (TODO.md "Rewrite all 2,520 questions"):

| Signal | Hit when… |
|---|---|
| `lengthTell`  | correct option is the longest AND > 1.15× the mean option length |
| `keywordTell` | correct option shares a content word with the stem that no distractor uses |
| `recallOnly`  | stem has < 18 words (likely tests recall, not scenario reasoning) |
| `underTagged` | question has < 2 tags |

## Pack ranking (worst-first by flagged %)

| Pack | Total | Flagged | % | length | keyword | recall | tags |
|---|---:|---:|---:|---:|---:|---:|---:|
| `ai-102` | 10 | 9 | 90% | 0 | 9 | 0 | 0 |
| `cloudflare-cass` | 10 | 9 | 90% | 0 | 9 | 0 | 0 |
| `aws-clf-c02` | 98 | 84 | 86% | 0 | 84 | 0 | 0 |
| `terraform-003` | 161 | 134 | 83% | 0 | 134 | 0 | 0 |
| `aws-sap-c02` | 10 | 8 | 80% | 0 | 8 | 0 | 0 |
| `dp-700` | 10 | 8 | 80% | 0 | 8 | 0 | 0 |
| `dp-900` | 10 | 8 | 80% | 0 | 8 | 0 | 0 |
| `gcp-pcse` | 10 | 8 | 80% | 0 | 8 | 0 | 0 |
| `kcsa` | 10 | 8 | 80% | 0 | 8 | 0 | 0 |
| `sc-100` | 10 | 8 | 80% | 0 | 8 | 0 | 0 |
| `snowpro-core` | 10 | 8 | 80% | 0 | 8 | 0 | 0 |
| `az-500` | 61 | 45 | 74% | 0 | 45 | 0 | 0 |
| `cissp` | 25 | 18 | 72% | 0 | 18 | 0 | 0 |
| `gcp-pde` | 60 | 43 | 72% | 1 | 42 | 0 | 0 |
| `aws-dea-c01` | 10 | 7 | 70% | 0 | 7 | 0 | 0 |
| `aws-mla-c01` | 10 | 7 | 70% | 0 | 7 | 0 | 0 |
| `ccnp-encor` | 40 | 28 | 70% | 0 | 28 | 0 | 0 |
| `ccsp` | 10 | 7 | 70% | 0 | 7 | 0 | 0 |
| `gcp-cdl` | 10 | 7 | 70% | 0 | 7 | 0 | 0 |
| `gcp-pcne` | 10 | 7 | 70% | 0 | 7 | 0 | 0 |
| `github-foundations` | 10 | 7 | 70% | 0 | 7 | 0 | 0 |
| `sc-200` | 10 | 7 | 70% | 0 | 7 | 0 | 0 |
| `az-305` | 61 | 42 | 69% | 0 | 42 | 0 | 0 |
| `splunk-core` | 66 | 45 | 68% | 0 | 45 | 0 | 0 |
| `rhcsa` | 61 | 41 | 67% | 0 | 41 | 0 | 0 |
| `az-400` | 10 | 6 | 60% | 0 | 6 | 0 | 0 |
| `ccnp` | 101 | 60 | 59% | 0 | 60 | 0 | 0 |
| `docker-dca` | 61 | 36 | 59% | 0 | 36 | 0 | 0 |
| `pcnsa` | 61 | 34 | 56% | 0 | 34 | 0 | 0 |
| `comptia-a-plus` | 101 | 56 | 55% | 0 | 56 | 0 | 0 |
| `az-104` | 56 | 31 | 55% | 0 | 31 | 0 | 0 |
| `aws-soa-c02` | 60 | 33 | 55% | 0 | 33 | 0 | 0 |
| `ccna` | 112 | 61 | 54% | 0 | 61 | 0 | 0 |
| `aws-scs-c02` | 61 | 32 | 52% | 0 | 32 | 0 | 0 |
| `gcp-pca` | 61 | 32 | 52% | 0 | 32 | 0 | 0 |
| `nse4` | 61 | 31 | 51% | 0 | 31 | 0 | 0 |
| `servicenow-csa` | 61 | 31 | 51% | 0 | 31 | 0 | 0 |
| `az-204` | 20 | 10 | 50% | 0 | 10 | 0 | 0 |
| `vault-002` | 51 | 24 | 47% | 0 | 24 | 0 | 0 |
| `comptia-network-plus` | 91 | 41 | 45% | 0 | 41 | 0 | 0 |
| `aws-dva-c02` | 61 | 27 | 44% | 0 | 27 | 0 | 0 |
| `aws-ans-c01` | 60 | 26 | 43% | 0 | 26 | 0 | 0 |
| `sc-900` | 60 | 26 | 43% | 0 | 26 | 0 | 0 |
| `az-900` | 91 | 38 | 42% | 0 | 38 | 0 | 0 |
| `gcp-ace` | 56 | 23 | 41% | 0 | 23 | 0 | 0 |
| `comptia-pentest` | 61 | 25 | 41% | 0 | 25 | 0 | 0 |
| `ai-900` | 20 | 8 | 40% | 0 | 8 | 0 | 0 |
| `aws-aif-c01` | 20 | 8 | 40% | 0 | 8 | 0 | 0 |
| `aws-dop-c02` | 10 | 4 | 40% | 0 | 4 | 0 | 0 |
| `ccnp-security` | 60 | 24 | 40% | 0 | 24 | 0 | 0 |
| `github-actions` | 10 | 4 | 40% | 0 | 4 | 0 | 0 |
| `kcna` | 10 | 4 | 40% | 0 | 4 | 0 | 0 |
| `cka` | 61 | 24 | 39% | 0 | 24 | 0 | 0 |
| `comptia-cysa` | 66 | 25 | 38% | 0 | 25 | 0 | 0 |
| `cks` | 61 | 22 | 36% | 0 | 22 | 0 | 0 |
| `comptia-security-plus` | 92 | 30 | 33% | 0 | 30 | 0 | 0 |
| `isc2-cc` | 10 | 3 | 30% | 0 | 3 | 0 | 0 |
| `ms-900` | 60 | 18 | 30% | 0 | 18 | 0 | 0 |
| `ckad` | 61 | 18 | 30% | 0 | 18 | 0 | 0 |
| `aws-saa-c03` | 60 | 6 | 10% | 0 | 6 | 0 | 0 |
| `comptia-linux` | 61 | 6 | 10% | 0 | 6 | 0 | 0 |

## Per-pack CSVs

See `audits/questions/<packId>.csv` — sorted worst-to-best, ready for the rewrite team to start at the top.
