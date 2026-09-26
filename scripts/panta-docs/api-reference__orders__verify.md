> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Verify primary buy

> Return current order status. Optional signature association without blocking on confirmation.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

<ParamField body="orderId" type="string" required>
  From build.
</ParamField>

<ParamField body="signature" type="string">
  Optional signature to associate (same as submit).
</ParamField>

<ParamField body="wallet" type="string">
  Optional wallet check.
</ParamField>

| `status`    | Meaning                                    |
| ----------- | ------------------------------------------ |
| `built`     | Instructions issued; not yet submitted     |
| `submitted` | Signature registered; confirmation pending |
| `confirmed` | On-chain confirmation recorded             |
| `failed`    | Confirmation or validation failed          |
| `expired`   | Session TTL elapsed                        |

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/primaryorderverify/ \
    -H "X-Api-Key: pk_test_…" \
    -H "Content-Type: application/json" \
    -d '{"orderId":"ord_abc123","signature":"5VEJv1R…base58Signature"}'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "orderId": "ord_…",
    "status": "confirmed",
    "signature": "…",
    "marketId": "…",
    "side": "yes",
    "amountUsdc": 20000000
  }
  ```
</ResponseExample>
