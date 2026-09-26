> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Create API key

> Issue a new API key. The plaintext secret is returned only in this response.

Accepts `X-Api-Key` or `Authorization: Bearer <access>` (typical after signup).

<Warning>
  Persist `secret` immediately. It cannot be retrieved again.
</Warning>

<ParamField body="env" type="string" required>
  `test` or `live` — selects the key prefix (`pk_test_…` / `pk_live_…`). Both are accepted on the public API.
</ParamField>

<ParamField body="name" type="string">
  Optional label (max 128).
</ParamField>

<ParamField body="revokeOthers" type="boolean">
  If `true`, revoke all other active keys for this account.
</ParamField>

<ResponseField name="secret" type="string">
  Full key (`pk_test_…` or `pk_live_…`). Only present on create.
</ResponseField>

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/account/keys/ \
    -H "Authorization: Bearer <access>" \
    -H "Content-Type: application/json" \
    -d '{"env":"test","name":"ci","revokeOthers":false}'
  ```
</RequestExample>

<ResponseExample>
  ```json 201 theme={null}
  {
    "id": "key_…",
    "name": "ci",
    "prefix": "pk_test_xxxx",
    "env": "test",
    "status": "active",
    "secret": "pk_test_…",
    "createdAt": "2026-09-04T12:00:00.000000Z",
    "revokedAt": null
  }
  ```
</ResponseExample>
