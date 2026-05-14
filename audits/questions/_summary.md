# Question-bank audit

Generated: 2026-05-14T18:44:25.300Z
Packs scanned: **51** · questions scanned: **2712** · flagged: **1997** (73.6%)

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
| `ccnp-encor` | 40 | 40 | 100% | 40 | 40 | 0 | 0 |
| `ccnp` | 101 | 100 | 99% | 97 | 100 | 0 | 0 |
| `docker-dca` | 61 | 60 | 98% | 55 | 58 | 0 | 0 |
| `comptia-a-plus` | 101 | 98 | 97% | 94 | 92 | 0 | 0 |
| `splunk-core` | 66 | 64 | 97% | 60 | 64 | 0 | 0 |
| `terraform-003` | 161 | 155 | 96% | 151 | 155 | 0 | 0 |
| `az-900` | 91 | 87 | 96% | 84 | 82 | 0 | 3 |
| `rhcsa` | 61 | 57 | 93% | 50 | 57 | 0 | 0 |
| `comptia-network-plus` | 91 | 85 | 93% | 67 | 81 | 0 | 0 |
| `az-104` | 56 | 51 | 91% | 32 | 47 | 0 | 0 |
| `aws-clf-c02` | 98 | 86 | 88% | 19 | 82 | 0 | 0 |
| `aws-ans-c01` | 60 | 52 | 87% | 43 | 39 | 0 | 0 |
| `aws-sap-c02` | 10 | 8 | 80% | 0 | 8 | 0 | 0 |
| `ccnp-security` | 60 | 48 | 80% | 44 | 31 | 0 | 0 |
| `dp-900` | 10 | 8 | 80% | 2 | 8 | 0 | 0 |
| `snowpro-core` | 10 | 8 | 80% | 1 | 8 | 0 | 0 |
| `sc-900` | 60 | 46 | 77% | 29 | 35 | 0 | 0 |
| `cissp` | 25 | 19 | 76% | 3 | 19 | 0 | 0 |
| `ccna` | 112 | 85 | 76% | 50 | 72 | 0 | 7 |
| `aws-soa-c02` | 60 | 45 | 75% | 25 | 34 | 0 | 0 |
| `comptia-cysa` | 66 | 49 | 74% | 32 | 32 | 0 | 0 |
| `az-500` | 61 | 45 | 74% | 0 | 45 | 0 | 0 |
| `aws-dva-c02` | 61 | 44 | 72% | 28 | 32 | 0 | 0 |
| `gcp-pde` | 60 | 43 | 72% | 5 | 42 | 0 | 0 |
| `comptia-pentest` | 61 | 43 | 70% | 25 | 30 | 0 | 0 |
| `aws-dea-c01` | 10 | 7 | 70% | 0 | 7 | 0 | 0 |
| `aws-mla-c01` | 10 | 7 | 70% | 0 | 7 | 0 | 0 |
| `cka` | 61 | 41 | 67% | 30 | 30 | 0 | 0 |
| `servicenow-csa` | 61 | 41 | 67% | 23 | 37 | 0 | 0 |
| `comptia-security-plus` | 92 | 61 | 66% | 17 | 58 | 0 | 0 |
| `aws-aif-c01` | 20 | 13 | 65% | 6 | 13 | 0 | 0 |
| `vault-002` | 51 | 33 | 65% | 20 | 26 | 0 | 0 |
| `aws-scs-c02` | 61 | 39 | 64% | 17 | 35 | 0 | 0 |
| `gcp-pca` | 61 | 39 | 64% | 23 | 34 | 0 | 0 |
| `az-204` | 20 | 12 | 60% | 4 | 12 | 0 | 0 |
| `az-400` | 10 | 6 | 60% | 0 | 6 | 0 | 0 |
| `nse4` | 61 | 35 | 57% | 9 | 31 | 0 | 0 |
| `az-305` | 61 | 34 | 56% | 16 | 27 | 0 | 0 |
| `pcnsa` | 61 | 34 | 56% | 14 | 28 | 0 | 0 |
| `cks` | 61 | 32 | 52% | 18 | 26 | 0 | 0 |
| `ckad` | 61 | 31 | 51% | 21 | 18 | 0 | 0 |
| `ai-102` | 10 | 5 | 50% | 0 | 5 | 0 | 0 |
| `aws-dop-c02` | 10 | 5 | 50% | 0 | 5 | 0 | 0 |
| `gcp-ace` | 56 | 28 | 50% | 9 | 26 | 0 | 0 |
| `ms-900` | 60 | 27 | 45% | 19 | 21 | 0 | 0 |
| `ai-900` | 20 | 8 | 40% | 0 | 8 | 0 | 0 |
| `github-actions` | 10 | 4 | 40% | 0 | 4 | 0 | 0 |
| `kcna` | 10 | 4 | 40% | 0 | 4 | 0 | 0 |
| `isc2-cc` | 10 | 3 | 30% | 0 | 3 | 0 | 0 |
| `comptia-linux` | 61 | 16 | 26% | 12 | 9 | 0 | 0 |
| `aws-saa-c03` | 60 | 6 | 10% | 0 | 6 | 0 | 0 |

## Per-pack CSVs

See `audits/questions/<packId>.csv` — sorted worst-to-best, ready for the rewrite team to start at the top.
