> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Revoke API key

> Revoke a key by id. Idempotent if the key is already revoked.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Accepts `X-Api-Key` or `Authorization: Bearer <access>`.

<ParamField path="id" type="string" required>
  Key identifier (`key_…`).
</ParamField>

Request body is empty.

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/account/keys/key_abc/revoke/ \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "id": "key_abc",
    "name": "ci",
    "prefix": "pk_test_xxxx",
    "env": "test",
    "status": "revoked",
    "createdAt": "2026-09-04T12:00:00.000000Z",
    "revokedAt": "2026-09-04T13:00:00.000000Z"
  }
  ```
</ResponseExample>
