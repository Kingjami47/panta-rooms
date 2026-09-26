> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# List creates

> Create-flow rows for the authenticated account (includes eventPda / market ids).

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Accepts `X-Api-Key` or `Authorization: Bearer <access>`.

Prefer [`GET /markets/?createdBy=me`](/api-reference/markets/list) for catalog DTOs of markets you created. This endpoint returns create-session metrics (`pending`, `built`, `registered`, …).

| Status       | Meaning                                   |
| ------------ | ----------------------------------------- |
| `pending`    | Quote reserved                            |
| `built`      | Unsigned tx built; register not completed |
| `registered` | Create tx verified and catalog registered |

<ParamField query="limit" type="integer" default="50">
  Max rows (capped at `200`).
</ParamField>

<ParamField query="status" type="string">
  Optional create status filter (`pending`, `registered`, …).
</ParamField>

<ResponseField name="summary" type="object">
  Create totals (`total`, `byStatus`).
</ResponseField>

<ResponseField name="items" type="array">
  Create rows — same shape as [Metrics](/api-reference/account/metrics) `creates[]` (`paymentUsdc` human decimal + `paymentUsdcBase`).
</ResponseField>

<RequestExample>
  ```bash cURL theme={null}
  curl "https://live-api.panta.market/api/v1/account/creates/?limit=50&status=registered" \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "summary": { "total": 1, "byStatus": { "registered": 1 } },
    "items": [
      {
        "createId": "cr_…",
        "eventPda": "…",
        "status": "registered",
        "wallet": "…",
        "signature": "…",
        "paymentUsdc": "50.00",
        "paymentUsdcBase": "50000000",
        "createdAt": "2026-09-04T12:00:00.000000Z",
        "updatedAt": "2026-09-04T12:05:00.000000Z"
      }
    ]
  }
  ```
</ResponseExample>
