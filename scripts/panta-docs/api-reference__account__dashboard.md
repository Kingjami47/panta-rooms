> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Dashboard

> Aggregated account, key counts, and usage counters.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Accepts `X-Api-Key` or `Authorization: Bearer <access>`.

<ResponseField name="account" type="object">
  Same shape as [Get account](/api-reference/account/get).
</ResponseField>

<ResponseField name="keys" type="object">
  `active`, `revoked`, and `total` key counts.
</ResponseField>

<ResponseField name="metrics" type="object">
  Create and trade totals for this account (`trades.volumeUsdcBase` = attributed volume in base units). Fees are not included — see [Metrics](/api-reference/account/metrics#estimating-protocol-fees-client-side).
</ResponseField>

<ResponseField name="permissions" type="object">
  Includes `canCreateMarkets`.
</ResponseField>

<RequestExample>
  ```bash cURL theme={null}
  curl https://live-api.panta.market/api/v1/account/dashboard/ \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "account": {
      "userId": "usr_…",
      "email": "you@example.com",
      "name": "Acme",
      "status": "active",
      "canCreateMarkets": true,
      "createdAt": "2026-09-04T12:00:00.000000Z",
      "apiKeyId": "key_…"
    },
    "keys": { "active": 1, "revoked": 0, "total": 1 },
    "metrics": {
      "creates": { "total": 0, "byStatus": {} },
      "trades": { "total": 0, "volumeUsdcBase": 0, "byKind": {} }
    },
    "permissions": { "canCreateMarkets": true }
  }
  ```
</ResponseExample>
