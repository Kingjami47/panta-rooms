> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# List API keys

> List API keys for the authenticated account. Secrets are never included.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Accepts `X-Api-Key` or `Authorization: Bearer <access>`.

<ResponseField name="keys" type="array">
  Key metadata. Each item has `id`, `name`, `prefix`, `env`, `status`, `createdAt`, `revokedAt`.
</ResponseField>

| Field       | Type           | Description                                      |
| ----------- | -------------- | ------------------------------------------------ |
| `id`        | string         | Key identifier (`key_…`)                         |
| `name`      | string         | Optional label                                   |
| `prefix`    | string         | First characters of the secret (for recognition) |
| `env`       | string         | `test` or `live`                                 |
| `status`    | string         | `active` or `revoked`                            |
| `createdAt` | string         | ISO-8601                                         |
| `revokedAt` | string \| null | ISO-8601 when revoked                            |

<RequestExample>
  ```bash cURL theme={null}
  curl https://live-api.panta.market/api/v1/account/keys/ \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "keys": [
      {
        "id": "key_…",
        "name": "ci",
        "prefix": "pk_test_xxxx",
        "env": "test",
        "status": "active",
        "createdAt": "2026-09-04T12:00:00.000000Z",
        "revokedAt": null
      }
    ]
  }
  ```
</ResponseExample>
