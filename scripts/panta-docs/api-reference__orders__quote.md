> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Quote primary buy

> Simulate fill and fee, then open a short-lived quote session.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

<ParamField body="wallet" type="string" required>
  Buyer wallet (base58).
</ParamField>

<ParamField body="marketId" type="string" required>
  Event / market address.
</ParamField>

<ParamField body="side" type="string" required>
  `yes` or `no` (case-insensitive).
</ParamField>

<ParamField body="amountUsdc" type="string" required>
  Deposit in human-readable USDC (string or number).
</ParamField>

<ParamField body="userId" type="string">
  Attribution id; may also be sent as `X-User-Id`.
</ParamField>

<ResponseField name="quoteId" type="string">
  Session id for build.
</ResponseField>

<ResponseField name="shares" type="string">
  Estimated shares received.
</ResponseField>

<ResponseField name="avgPrice" type="string">
  Estimated average price.
</ResponseField>

<ResponseField name="feeUsdc" type="string">
  Protocol fee (human-readable USDC).
</ResponseField>

<ResponseField name="expiresAt" type="string">
  Quote expiry.
</ResponseField>

Errors: `INVALID_MARKET_PARAMS` · `MARKET_NOT_FOUND` · `MARKET_NOT_IN_PRIMARY` · `AMOUNT_TOO_SMALL` · `RATE_LIMITED`.

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/primaryorderquote/ \
    -H "X-Api-Key: pk_test_…" \
    -H "Content-Type: application/json" \
    -d '{
      "wallet": "Buyer111111111111111111111111111111111",
      "marketId": "EventPda11111111111111111111111111111",
      "side": "yes",
      "amountUsdc": "20.00",
      "userId": "usr_acme"
    }'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "quoteId": "qt_…",
    "marketId": "…",
    "side": "yes",
    "amountUsdc": "20.00",
    "shares": "38.42",
    "avgPrice": "0.520800",
    "feeUsdc": "0.40",
    "expiresAt": "2026-09-04T16:27:00.000000Z",
    "blockhashExpiryHintSec": 60
  }
  ```
</ResponseExample>
