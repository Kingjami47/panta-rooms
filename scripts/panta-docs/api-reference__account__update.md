> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Update account

> Update the display name on the authenticated account.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Accepts `X-Api-Key` or `Authorization: Bearer <access>`.

<ParamField body="name" type="string" required>
  Non-empty display name (max 255).
</ParamField>

Response schema matches [Get account](/api-reference/account/get).

<RequestExample>
  ```bash cURL theme={null}
  curl -X PATCH https://live-api.panta.market/api/v1/account/ \
    -H "X-Api-Key: pk_test_…" \
    -H "Content-Type: application/json" \
    -d '{"name":"Acme Labs"}'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "userId": "usr_…",
    "email": "you@example.com",
    "name": "Acme Labs",
    "status": "active",
    "canCreateMarkets": true,
    "createdAt": "2026-09-04T12:00:00.000000Z",
    "apiKeyId": "key_…"
  }
  ```
</ResponseExample>
