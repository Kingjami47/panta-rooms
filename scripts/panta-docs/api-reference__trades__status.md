> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Trade status

> Attribution or confirmation status for a signature.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Responses do not expose another account’s private attribution fields.

<ParamField path="signature" type="string" required>
  Solana transaction signature.
</ParamField>

<ParamField query="userId" type="string">
  Scopes visibility when set.
</ParamField>

| `status`              | Meaning                                            |
| --------------------- | -------------------------------------------------- |
| `processed`           | Attribution stored                                 |
| `pending_attribution` | Seen on-chain, not yet attributed                  |
| `unknown`             | Not found or not visible under the requested scope |
| `failed`              | Confirmation or validation failed                  |

<RequestExample>
  ```bash cURL theme={null}
  curl https://live-api.panta.market/api/v1/trades/5VEJv1R…/ \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json Attributed theme={null}
  {
    "signature": "…",
    "status": "processed",
    "marketId": "…",
    "wallet": "…"
  }
  ```

  ```json Pending theme={null}
  {
    "signature": "…",
    "status": "pending_attribution"
  }
  ```

  ```json Unknown theme={null}
  {
    "signature": "…",
    "status": "unknown"
  }
  ```
</ResponseExample>
