> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Wallet trades

> Balr catalog trades for a wallet address.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Accepts `X-Api-Key` or `Authorization: Bearer <access>`.

Catalog trade history for a wallet (not partner attribution rows). For market-scoped tape see [Market trades](/api-reference/markets/trades).

<ParamField path="wallet" type="string" required>
  Base58 Solana public key.
</ParamField>

<ParamField query="limit" type="integer" default="50">
  Max rows (capped at `200`).
</ParamField>

<ResponseField name="wallet" type="string">
  Echo of the path wallet.
</ResponseField>

<ResponseField name="items" type="array">
  Same trade row shape as [Market trades](/api-reference/markets/trades).
</ResponseField>

Errors: `UNAUTHORIZED` · `RATE_LIMITED` · `INVALID_MARKET_PARAMS`.

<RequestExample>
  ```bash cURL theme={null}
  curl "https://live-api.panta.market/api/v1/wallets/Buyer111111111111111111111111111111111/trades/?limit=50" \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "wallet": "…",
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
