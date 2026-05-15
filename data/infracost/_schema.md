# InfraCost provider data schema

One JSON per cloud provider, loaded by `/infracost/index.html`. Every
file declares **monthly USD rates** for four resource buckets, plus
sources + last-reviewed pill so the page can render a freshness
disclaimer. EUR providers (Hetzner, Scaleway when added) bake the
EUR→USD conversion into the published rates and declare the
conversion rate used.

## File layout

`data/infracost/<slug>.json` where `<slug>` matches the provider id
used by `/infracost/` (manifest is implicit — the page hard-codes
the load order so providers always render in the same order).

## Top-level fields

| Field          | Type    | Notes                                                        |
| -------------- | ------- | ------------------------------------------------------------ |
| `id`           | string  | Stable provider id (e.g. `aws`, `gcp`, `hetzner`).           |
| `provider`     | string  | Display name (e.g. `AWS`, `Cloudflare R2`).                  |
| `region`       | string  | Region the rates apply to. **One region per file**.          |
| `nativeCurrency` | string | `USD`, `EUR`, etc. — what the provider bills in.            |
| `displayCurrency` | string | Always `USD` for cross-provider comparability.             |
| `fxNote`       | string  | Conversion line if `native ≠ display` (e.g. `1 EUR = 1.08 USD, May 2026`). |
| `lastReviewed` | string  | `YYYY-MM` — rendered in the freshness pill.                  |
| `sources`      | array   | `[{ url, label, accessedAt }]` — at least one per page.      |
| `note`         | string? | Optional caveat shown under the provider card.               |
| `affiliate`    | object? | `{ url, label }` if we have a referral link.                 |
| `compute`      | object  | See below.                                                   |
| `blockStorage` | object  | See below.                                                   |
| `egress`       | object  | See below.                                                   |
| `objectStorage`| object  | See below.                                                   |

## Bucket: `compute`

| Field                   | Type    | Notes                                                              |
| ----------------------- | ------- | ------------------------------------------------------------------ |
| `available`             | bool    | `false` for storage-only providers (Cloudflare R2).               |
| `pricePerVcpuMonth`     | number  | USD per vCPU-month (730h).                                         |
| `pricePerGbRamMonth`    | number  | USD per GB-RAM-month.                                              |
| `sku`                   | string  | Reference SKU the rate was derived from (e.g. `t3.large` family). |
| `note`                  | string? | Optional caveat.                                                   |

## Bucket: `blockStorage`

| Field                  | Type   | Notes                                                       |
| ---------------------- | ------ | ----------------------------------------------------------- |
| `available`            | bool   | `false` for storage-only or compute-bundled providers.      |
| `pricePerGbMonth`      | number | USD per GB-month of attached block storage.                 |
| `includedGbPerVcpu`    | number?| If the provider bundles storage with compute (Hetzner).     |
| `sku`                  | string | e.g. `EBS gp3`, `pd-balanced`, `Volume` (Hetzner).          |

## Bucket: `egress`

| Field                  | Type   | Notes                                                       |
| ---------------------- | ------ | ----------------------------------------------------------- |
| `available`            | bool   |                                                             |
| `freeGbPerMonth`       | number | Free egress tier per month.                                 |
| `pricePerGbAfterFree`  | number | USD per GB after the free tier.                             |
| `note`                 | string?| e.g. `Internet egress, intra-region free`.                  |

## Bucket: `objectStorage`

| Field                  | Type   | Notes                                                       |
| ---------------------- | ------ | ----------------------------------------------------------- |
| `available`            | bool   |                                                             |
| `pricePerGbMonth`      | number | USD per GB-month standard tier.                             |
| `egressPricePerGb`     | number | USD per GB (0 if egress is free, like R2).                  |
| `sku`                  | string | e.g. `S3 Standard`, `Cloud Storage Standard`, `R2`.         |

## Compute formula (used by the SPA)

```
hoursPerMonth        = 730
monthlyCompute       = vcpu * pricePerVcpuMonth + ramGb * pricePerGbRamMonth
monthlyBlockStorage  = max(0, storageGb - bundledStorageGb(vcpu)) * pricePerGbMonth
monthlyEgress        = max(0, egressGb - freeGbPerMonth) * pricePerGbAfterFree
monthlyObjectStorage = objectGb * pricePerGbMonth (+ objectEgressGb * egressPricePerGb if surfaced)
total                = sum of available buckets
```

Providers whose `compute.available = false` (e.g. Cloudflare R2) show
"—" for compute and only contribute storage costs. The SPA still
renders them so users see how cheap storage-only stacks are.

## Honesty checklist

- All prices are **list price**, on-demand, no commitments — no Reserved /
  Savings Plans / sustained-use discounts.
- Rates are approximate (rounded to a sensible precision); the page
  surfaces a "indicative — list price, on-demand" disclaimer.
- `lastReviewed` must be bumped every time a rate is updated. Stale
  rates are worse than no rates.
