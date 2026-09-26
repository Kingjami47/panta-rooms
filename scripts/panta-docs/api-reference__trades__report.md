> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Report trade

> Verify an on-chain primary buy or win claim and upsert attribution keyed by signature.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

This is not a full market trade history. Primary-buy transactions that include an attribution memo may be ingested automatically; this endpoint is the explicit reporting path. Repeated calls with the same signature are idempotent.

Verification is fail-closed. The transaction must invoke the USDC program and be either:

* `primary_order_usdc` (buy), or
* `claim_win_usdc` (win claim from [`POST /claim/build/`](/api-reference/claims/build))

[Creator fee claims](/api-reference/claims/creator-fees) (`claim_creator_fees_usdc`) are **not** attributable here — reporting them returns `TX_MISMATCH`.

<ParamField body="signature" type="string" required>
  Solana transaction signature.
</ParamField>

<ParamField body="wallet" type="string" required>
  Trader wallet.
</ParamField>

<ParamField body="marketId" type="string" required>
  Event / market address.
</ParamField>

<ParamField body="quoteId" type="string">
  Primary quote id when available.
</ParamField>

<ParamField body="clientOrderId" type="string">
  Client-supplied reference.
</ParamField>

<ParamField body="userId" type="string">
  Attribution id; defaults from the API key account or `X-User-Id`.
</ParamField>

<ResponseField name="status" type="string">
  `processed` when attribution is stored.
</ResponseField>

<ResponseField name="kind" type="string">
  `buy` (primary order) or `claim` (win claim only).
</ResponseField>

<ResponseField name="side" type="string">
  `yes` or `no` when applicable.
</ResponseField>

Errors: `TX_NOT_FOUND` · `TX_FAILED` · `TX_MISMATCH` · `TX_FEE_MISMATCH` · `UNAUTHORIZED` · `INVALID_MARKET_PARAMS` · `RATE_LIMITED`.

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/trades/ \
    -H "X-Api-Key: pk_test_…" \
    -H "Content-Type: application/json" \
    -d '{
      "signature": "5VEJv1R…base58Signature",
      "wallet": "Buyer111111111111111111111111111111111",
      "marketId": "EventPda11111111111111111111111111111",
      "quoteId": "qt_abc123",
      "clientOrderId": "ord-client-42",
      "userId": "usr_acme"
    }'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "signature": "…",
    "status": "processed",
    "marketId": "…",
    "wallet": "…",
    "side": "yes",
    "kind": "buy"
  }
  ```
</ResponseExample>
