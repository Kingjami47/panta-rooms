> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# List markets

> Paginated USDC market catalog with optional category, phase, and createdBy filters.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Accepts `X-Api-Key` or `Authorization: Bearer <access>`.

List rows come from the **USDC market catalog** (registry), not a live full-chain scan. They do **not** live-RPC for prices. Use [Get market](/api-reference/markets/get) for spot prices. `createdByPartner` is `true` when this account has a create metric for that `marketId`.

Without `createdBy=me`, the list is the general public catalog (optionally filtered by category/status). With `createdBy=me`, only markets this API account created via the create flow.

<ParamField query="category" type="string">
  Must be in [`GET /categories/`](/api-reference/markets/categories).
</ParamField>

<ParamField query="status" type="string">
  Market phase: `primary` | `secondary` | `resolved` | `cancelled`.
</ParamField>

<ParamField query="createdBy" type="string">
  Only `me` — markets this account created (via create metrics).
</ParamField>

<ParamField query="cursor" type="string">
  Opaque `marketId` cursor from a previous page’s `nextCursor`.
</ParamField>

<ParamField query="limit" type="integer" default="20">
  Page size (max `50`).
</ParamField>

<ResponseField name="items" type="array">
  Catalog rows (see fields below).
</ResponseField>

<ResponseField name="nextCursor" type="string">
  Pass as `cursor` for the next page; omit or null when done.
</ResponseField>

| Field                                              | Type           | Description                                           |
| -------------------------------------------------- | -------------- | ----------------------------------------------------- |
| `marketId`                                         | string         | Event / market address                                |
| `category`                                         | string         | Catalog category                                      |
| `title`                                            | string         | Display title                                         |
| `description`                                      | string         | Catalog description                                   |
| `images`                                           | string\[]      | Catalog image URLs                                    |
| `phase`                                            | string         | `primary` \| `secondary` \| `resolved` \| `cancelled` |
| `marketType`                                       | string         | `standard` or `breaking`                              |
| `startTime` / `endTime` / `resolutionTime`         | integer        | Unix seconds                                          |
| `region`                                           | string         | e.g. `Global`                                         |
| `resolved`                                         | boolean        | Resolution flag                                       |
| `status`                                           | string         | Catalog status label                                  |
| `volumeUsdc`                                       | string         | Human-readable volume                                 |
| `campaignId`                                       | string \| null | Optional campaign                                     |
| `createdByPartner`                                 | boolean        | Created by this API account                           |
| `yesPrice` / `noPrice` / `primary*` / `secondary*` | string \| null | `null` on list; filled on detail                      |

Errors: `UNAUTHORIZED` · `RATE_LIMITED` · `INVALID_MARKET_PARAMS`.

<RequestExample>
  ```bash cURL theme={null}
  curl "https://live-api.panta.market/api/v1/markets/?category=crypto&status=primary&limit=20" \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "items": [
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
        "yesPrice": null,
        "noPrice": null,
        "primaryYesPrice": null,
        "primaryNoPrice": null,
        "secondaryYesPrice": null,
        "secondaryNoPrice": null
      }
    ],
    "nextCursor": "…"
  }
  ```
</ResponseExample>
