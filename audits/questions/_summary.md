# Question-bank audit

Generated: 2026-05-14T07:13:51.252Z
Packs scanned: **50** · questions scanned: **2702** · flagged: **2032** (75.2%)

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
| `aws-clf-c02` | 98 | 98 | 100% | 80 | 90 | 0 | 0 |
| `ccnp-encor` | 40 | 40 | 100% | 40 | 40 | 0 | 0 |
| `ccnp` | 101 | 101 | 100% | 97 | 100 | 1 | 1 |
| `docker-dca` | 61 | 61 | 100% | 55 | 58 | 1 | 0 |
| `snowpro-core` | 10 | 10 | 100% | 3 | 3 | 8 | 0 |
| `comptia-a-plus` | 101 | 99 | 98% | 94 | 92 | 1 | 0 |
| `splunk-core` | 66 | 64 | 97% | 60 | 64 | 2 | 0 |
| `az-900` | 91 | 88 | 97% | 84 | 82 | 1 | 3 |
| `terraform-003` | 161 | 155 | 96% | 151 | 140 | 42 | 0 |
| `comptia-network-plus` | 91 | 86 | 95% | 67 | 81 | 1 | 1 |
| `rhcsa` | 61 | 57 | 93% | 50 | 57 | 0 | 0 |
| `az-104` | 56 | 51 | 91% | 32 | 47 | 0 | 0 |
| `aws-ans-c01` | 60 | 52 | 87% | 43 | 39 | 0 | 0 |
| `az-500` | 61 | 49 | 80% | 17 | 44 | 1 | 0 |
| `aws-sap-c02` | 10 | 8 | 80% | 0 | 8 | 0 | 0 |
| `ccnp-security` | 60 | 48 | 80% | 43 | 29 | 3 | 0 |
| `dp-900` | 10 | 8 | 80% | 0 | 5 | 5 | 0 |
| `comptia-cysa` | 66 | 52 | 79% | 36 | 19 | 19 | 0 |
| `sc-900` | 60 | 46 | 77% | 28 | 32 | 8 | 0 |
| `vault-002` | 51 | 39 | 76% | 22 | 17 | 23 | 0 |
| `cissp` | 25 | 19 | 76% | 3 | 19 | 0 | 0 |
| `ccna` | 112 | 85 | 76% | 50 | 72 | 0 | 7 |
| `aws-soa-c02` | 60 | 45 | 75% | 25 | 34 | 0 | 0 |
| `aws-dva-c02` | 61 | 45 | 74% | 28 | 32 | 1 | 0 |
| `comptia-pentest` | 61 | 44 | 72% | 23 | 29 | 5 | 0 |
| `gcp-pde` | 60 | 43 | 72% | 5 | 42 | 0 | 0 |
| `aws-dea-c01` | 10 | 7 | 70% | 0 | 7 | 0 | 0 |
| `aws-mla-c01` | 10 | 7 | 70% | 0 | 7 | 0 | 0 |
| `servicenow-csa` | 61 | 42 | 69% | 23 | 37 | 1 | 0 |
| `cka` | 61 | 41 | 67% | 28 | 29 | 3 | 0 |
| `comptia-security-plus` | 92 | 61 | 66% | 17 | 58 | 0 | 0 |
| `aws-aif-c01` | 20 | 13 | 65% | 0 | 3 | 10 | 0 |
| `aws-scs-c02` | 61 | 39 | 64% | 17 | 35 | 0 | 0 |
| `gcp-pca` | 61 | 39 | 64% | 23 | 34 | 0 | 0 |
| `az-204` | 20 | 12 | 60% | 0 | 10 | 4 | 0 |
| `nse4` | 61 | 36 | 59% | 9 | 31 | 1 | 0 |
| `cks` | 61 | 35 | 57% | 10 | 19 | 13 | 0 |
| `az-305` | 61 | 34 | 56% | 16 | 27 | 0 | 0 |
| `pcnsa` | 61 | 34 | 56% | 10 | 25 | 4 | 0 |
| `ckad` | 61 | 31 | 51% | 21 | 18 | 1 | 0 |
| `ai-102` | 10 | 5 | 50% | 0 | 5 | 0 | 0 |
| `aws-dop-c02` | 10 | 5 | 50% | 0 | 5 | 0 | 0 |
| `gcp-ace` | 56 | 28 | 50% | 0 | 19 | 12 | 0 |
| `ms-900` | 60 | 28 | 47% | 17 | 19 | 3 | 0 |
| `ai-900` | 20 | 8 | 40% | 0 | 7 | 1 | 0 |
| `github-actions` | 10 | 4 | 40% | 0 | 4 | 0 | 0 |
| `kcna` | 10 | 4 | 40% | 0 | 4 | 0 | 0 |
| `isc2-cc` | 10 | 3 | 30% | 0 | 3 | 0 | 0 |
| `comptia-linux` | 61 | 17 | 28% | 11 | 7 | 3 | 0 |
| `aws-saa-c03` | 60 | 6 | 10% | 0 | 6 | 0 | 0 |

## Per-pack CSVs

See `audits/questions/<packId>.csv` — sorted worst-to-best, ready for the rewrite team to start at the top.
