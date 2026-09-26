> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Market trades

> Balr catalog trade tape for a single market.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Accepts `X-Api-Key` or `Authorization: Bearer <access>`.

Returns catalog trades for the market (`isPrimary`, amounts, signature, `blockTime`). This is the public tape, not partner attribution — for attribution see [Report trade](/api-reference/trades/report).

<ParamField path="marketId" type="string" required>
  Event / market address.
</ParamField>

<ParamField query="limit" type="integer" default="50">
  Max rows (capped at `200`).
</ParamField>

<ResponseField name="marketId" type="string">
  Echo of the path market id.
</ResponseField>

<ResponseField name="items" type="array">
  Catalog trade rows.
</ResponseField>

| Field                    | Type             | Description              |
| ------------------------ | ---------------- | ------------------------ |
| `id`                     | string \| number | Catalog trade id         |
| `marketId`               | string           | Event PDA                |
| `wallet`                 | string           | Trader address           |
| `isPrimary`              | boolean          | Primary-phase trade      |
| `yesAmount` / `noAmount` | string \| number | Share amounts            |
| `feePaid`                | string \| number | Fee paid                 |
| `blockTime`              | integer \| null  | Unix seconds             |
| `signature`              | string           | Transaction signature    |
| `quoteAsset`             | string           | Quote mint / asset label |

Errors: `UNAUTHORIZED` · `RATE_LIMITED` · `INVALID_MARKET_PARAMS`.

<RequestExample>
  ```bash cURL theme={null}
  curl "https://live-api.panta.market/api/v1/markets/EventPda11111111111111111111111111111/trades/?limit=50" \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "marketId": "…",
    "items": [
      {
        "id": "…",
        "marketId": "…",
        "wallet": "…",
        "isPrimary": true,
        "yesAmount": "10.00",
        "noAmount": "0",
        "feePaid": "0.05",
        "blockTime": 1767225600,
        "signature": "5VEJv1R…",
        "quoteAsset": "USDC"
      }
    ]
  }
  ```
</ResponseExample>
