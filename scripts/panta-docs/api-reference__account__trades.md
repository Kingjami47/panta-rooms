> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# List attributed trades

> Partner attribution rows for the authenticated account (volume credited to this key/user).

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Accepts `X-Api-Key` or `Authorization: Bearer <access>`.

These are attribution rows, not the full Balr trade tape. For catalog tape use [Market trades](/api-reference/markets/trades) or [Wallet trades](/api-reference/markets/wallet-trades).

`summary.volumeUsdcBase` is the sum of attributed buy/claim sizes in USDC **base units** (÷ 1e6 for dollars). Protocol fees are not included — see [Metrics → Estimating protocol fees](/api-reference/account/metrics#estimating-protocol-fees-client-side).

<ParamField query="limit" type="integer" default="50">
  Max rows (capped at `200`).
</ParamField>

<ParamField query="kind" type="string">
  Optional `buy` or `claim`.
</ParamField>

<ResponseField name="summary" type="object">
  Trade totals (`total`, `volumeUsdcBase`, `byKind`).
</ResponseField>

<ResponseField name="items" type="array">
  Attribution rows: `signature`, `wallet`, `marketId`, `side`, `kind`, `amountUsdc` (human decimal), `amountUsdcBase`, `status`, `createdAt`.
</ResponseField>

<RequestExample>
  ```bash cURL theme={null}
  curl "https://live-api.panta.market/api/v1/account/trades/?limit=50&kind=buy" \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "summary": {
      "total": 2,
      "volumeUsdcBase": 40000000,
      "byKind": { "buy": 2 }
    },
    "items": [
      {
        "signature": "5VEJv1R…",
        "wallet": "…",
        "marketId": "…",
        "side": "yes",
        "kind": "buy",
        "amountUsdc": "20.00",
        "amountUsdcBase": "20000000",
        "status": "processed",
        "createdAt": "2026-09-04T12:00:00.000000Z"
      }
    ]
  }
  ```
</ResponseExample>
