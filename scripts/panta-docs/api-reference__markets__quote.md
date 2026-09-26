> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Quote a market

> Validate parameters, soft-check the catalog image URL, reserve a create session, and return the USDC creation fee.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Fee amounts are USDC **base units** (integer strings, 6 decimals). `paymentUsdc` in the request is ignored; the fee comes from on-chain config.

## Market image

`imageUrl` is required and **catalog-only** (not written on-chain). Either host the file yourself or use [`POST /markets/create/image-upload/`](/api-reference/markets/image-upload) and pass Cloudinary's `secure_url`.

| Rule       | Value                                                                             |
| ---------- | --------------------------------------------------------------------------------- |
| Count      | Exactly one URL (string, not an array)                                            |
| Protocol   | Publicly reachable `http` or `https`                                              |
| Host       | Must not be localhost / private network (SSRF guard)                              |
| Dimensions | Recommended **1024×1024** square (client/uploader concern — not a hard API check) |
| Max length | 2048 characters                                                                   |

Do not pass data URLs, short-lived signed URLs, or private buckets. Soft validation may reject unsafe hosts; there is no hard format/size gate.

<ParamField body="wallet" type="string" required>
  Fee payer and transaction signer (base58).
</ParamField>

<ParamField body="question" type="string" required>
  Market question (max 512). Combined with `wallet` to derive the event address.
</ParamField>

<ParamField body="resolutionRule" type="string" required>
  Resolution criteria (max 2048).
</ParamField>

<ParamField body="sourcesOfTruth" type="string[]" required>
  Non-empty list (max 20).
</ParamField>

<ParamField body="category" type="string" required>
  One of `sports`, `crypto`, `politics`, `entertainment`, `finance`, `science`, `world`, `other`.
</ParamField>

<ParamField body="startTime" type="integer" required>
  Unix seconds. Must satisfy `startTime < endTime ≤ resolutionTime`. Unless `eventInProgress` is true on a breaking market, `startTime` must be at least on-chain `minimumStartDelay` ahead of now (typically **3600** seconds).
</ParamField>

<ParamField body="endTime" type="integer" required>
  Unix seconds. When `eventInProgress` is true (breaking only), `endTime` must still be in the future.
</ParamField>

<ParamField body="resolutionTime" type="integer" required>
  Unix seconds.
</ParamField>

<ParamField body="imageUrl" type="string" required>
  Catalog image URL (`http`/`https`). Soft-validated (SSRF + optional sniff). Recommended 1024×1024 square.
</ParamField>

<ParamField body="marketType" type="string">
  `standard` (default) or `breaking`.
</ParamField>

<ParamField body="eventInProgress" type="boolean">
  Allowed only when `marketType` is `breaking`. Skips the `minimumStartDelay` check on `startTime`; still requires `endTime` in the future. Do not set this with a future `startTime` on standard markets.
</ParamField>

<ParamField body="title" type="string">
  Defaults to `question`.
</ParamField>

<ParamField body="description" type="string">
  Catalog description.
</ParamField>

<ParamField body="region" type="string">
  Defaults to `Global`.
</ParamField>

<ParamField body="oracle" type="string">
  Defaults to `sourcesOfTruth` joined by `,`.
</ParamField>

<ResponseField name="createId" type="string">
  Session id for build and register.
</ResponseField>

<ResponseField name="expectedEventPda" type="string">
  Expected on-chain event address.
</ResponseField>

<ResponseField name="paymentUsdc" type="string">
  Total creation fee (base units).
</ResponseField>

<ResponseField name="liquidityInjectionUsdc" type="string">
  Liquidity portion of the fee.
</ResponseField>

<ResponseField name="platformRevenueUsdc" type="string">
  Platform portion of the fee.
</ResponseField>

<ResponseField name="expiresAt" type="string">
  Session expiry (ISO-8601).
</ResponseField>

Errors: `INVALID_MARKET_PARAMS` · `DUPLICATE_MARKET` · `CREATE_NOT_PERMITTED` · `UNAUTHORIZED` · `RATE_LIMITED`. Field validation failures (including a bad `imageUrl`) return HTTP `400` with `code` plus `fields`.

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/markets/create/quote/ \
    -H "X-Api-Key: pk_test_…" \
    -H "Content-Type: application/json" \
    -d '{
      "wallet": "Creator1111111111111111111111111111111",
      "question": "Will ETH be above $5,000 on 2027-01-01?",
      "resolutionRule": "CoinGecko daily close UTC",
      "sourcesOfTruth": ["https://www.coingecko.com"],
      "category": "crypto",
      "startTime": 1893456000,
      "endTime": 1896127200,
      "resolutionTime": 1896130800,
      "marketType": "standard",
      "title": "ETH above 5k?",
      "description": "Resolves from CoinGecko.",
      "imageUrl": "https://cdn.example.com/markets/eth-5k-1024.webp",
      "region": "Global"
    }'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "createId": "cr_…",
    "expectedEventPda": "…",
    "paymentUsdc": "50000000",
    "liquidityInjectionUsdc": "10000000",
    "platformRevenueUsdc": "40000000",
    "marketType": "standard",
    "expiresAt": "2026-09-04T16:30:00.000000Z",
    "blockhashExpiryHintSec": 60
  }
  ```
</ResponseExample>
