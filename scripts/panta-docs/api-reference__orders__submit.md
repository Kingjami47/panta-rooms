> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Submit primary buy

> Register the broadcast signature for asynchronous confirmation. Does not wait for finalization.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Repeating the same `orderId` and `signature` is safe to retry.

<ParamField body="orderId" type="string" required>
  From build.
</ParamField>

<ParamField body="signature" type="string" required>
  Broadcast transaction signature.
</ParamField>

<ParamField body="wallet" type="string">
  If set, must match the order wallet.
</ParamField>

<ResponseField name="status" type="string">
  `submitted` when the signature is registered.
</ResponseField>

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/primaryordersubmit/ \
    -H "X-Api-Key: pk_test_…" \
    -H "Content-Type: application/json" \
    -d '{
      "orderId": "ord_abc123",
      "signature": "5VEJv1R…base58Signature",
      "wallet": "Buyer111111111111111111111111111111111"
    }'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "orderId": "ord_…",
    "status": "submitted",
    "signature": "…"
  }
  ```
</ResponseExample>
