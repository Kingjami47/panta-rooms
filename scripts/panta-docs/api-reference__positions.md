> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# List positions

> USDC market holdings for a wallet — shares, phase, and claim eligibility.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Indexer balances may lag the chain briefly after a purchase. Result sets are capped (typically 200 rows). When `claimable` is `true`, use [Build win claim](/api-reference/claims/build). Creator fees use a separate path: [Claim creator fees](/api-reference/claims/creator-fees).

Each holding with both YES and NO shares becomes **two rows** (one per `side`) for the same `marketId` — that is expected, not a duplicate.

<ParamField query="wallet" type="string" required>
  Base58 Solana public key.
</ParamField>

<ResponseField name="wallet" type="string">
  Echo of the requested wallet.
</ResponseField>

<ResponseField name="positions" type="array">
  Holdings. Empty array when none.
</ResponseField>

| Field       | Type           | Description                                           |
| ----------- | -------------- | ----------------------------------------------------- |
| `marketId`  | string         | Event / market address                                |
| `category`  | string \| null | From the catalog when available                       |
| `side`      | string         | `yes` or `no`                                         |
| `shares`    | string         | Human-readable share quantity                         |
| `phase`     | string         | `primary` \| `secondary` \| `resolved` \| `cancelled` |
| `claimable` | boolean        | Claim construction is allowed for this side           |
| `claimed`   | boolean        | A claim account already exists                        |
| `outcome`   | string \| null | `yes` / `no` after resolution; otherwise `null`       |

Errors: `INVALID_MARKET_PARAMS` · `RATE_LIMITED`.

## Estimating position value (client-side)

Positions return **share quantity**, not a dollar balance. Your app should combine:

1. [`GET /positions/?wallet=`](/api-reference/positions) — `shares`, `side`, `claimable`, `outcome`
2. [`GET /markets/{marketId}/`](/api-reference/markets/get) — spot `yesPrice` / `noPrice` (list rows often leave these `null`)

| Situation                                        | How to estimate                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Open market (`outcome` null, not claimable)      | `value ≈ shares × yesPrice` if `side` is `yes`, else `shares × noPrice`                         |
| Resolved winner (`side === outcome`) / claimable | ≈ **1 USDC per share** (or `winningShares` from [Build win claim](/api-reference/claims/build)) |
| Resolved loser (`side !== outcome`)              | ≈ `0`                                                                                           |

Once a market is **resolved**, stop using live spot prices for portfolio value — settlement is win ≈ $1/share, lose = $0. Spot `yesPrice` / `noPrice` are for open markets.

Example (open YES position):

```text theme={null}
shares = 38.40
yesPrice = 0.52   // from GET /markets/{marketId}/
estValueUsdc ≈ 38.40 × 0.52 = 19.97
```

This is mark-to-market for UI display — not a guaranteed settlement amount. Cache market detail per distinct `marketId` so you do not refetch the same market for every row.

<RequestExample>
  ```bash cURL theme={null}
  curl "https://live-api.panta.market/api/v1/positions/?wallet=Buyer111111111111111111111111111111111" \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "wallet": "…",
    "positions": [
      {
        "marketId": "…",
        "category": "crypto",
        "side": "yes",
        "shares": "38.40",
        "phase": "primary",
        "claimable": false,
        "claimed": false,
        "outcome": null
      }
    ]
  }
  ```
</ResponseExample>
