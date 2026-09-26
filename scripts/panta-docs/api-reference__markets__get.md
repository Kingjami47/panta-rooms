> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Get market

> Single USDC market catalog row with spot prices when RPC is available.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Accepts `X-Api-Key` or `Authorization: Bearer <access>`.

Same item shape as [List markets](/api-reference/markets/list), with `yesPrice` / `noPrice` / `primary*` / `secondary*` filled from on-chain state when RPC is available.

Use these prices with [List positions](/api-reference/positions#estimating-position-value-client-side) to estimate mark-to-market value in your client (`shares ×` side price).

<ParamField path="marketId" type="string" required>
  Event / market address (base58).
</ParamField>

Errors: `UNAUTHORIZED` · `RATE_LIMITED` · `MARKET_NOT_FOUND`.

<RequestExample>
  ```bash cURL theme={null}
  curl "https://live-api.panta.market/api/v1/markets/EventPda11111111111111111111111111111/" \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "marketId": "…",
    "category": "crypto",
    "title": "ETH above 5k?",
    "description": "…",
    "images": ["https://…"],
    "phase": "primary",
    "marketType": "standard",
    "startTime": 1767225600,
    "endTime": 1798761599,
    "resolutionTime": 1798765199,
    "region": "Global",
    "resolved": false,
    "status": "open",
    "volumeUsdc": "1200.00",
    "campaignId": null,
    "createdByPartner": true,
    "yesPrice": "0.52",
    "noPrice": "0.48",
    "primaryYesPrice": "0.52",
    "primaryNoPrice": "0.48",
    "secondaryYesPrice": null,
    "secondaryNoPrice": null
  }
  ```
</ResponseExample>
