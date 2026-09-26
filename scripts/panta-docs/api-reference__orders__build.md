> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Build primary buy

> Construct unsigned primary_order_usdc instructions from a live quote.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Rejected if the curve has moved beyond `maxSlippageBps` (`QUOTE_STALE`). Compile a versioned transaction from `instructions` and `recentBlockhash`, sign with `wallet`, then broadcast.

<ParamField body="quoteId" type="string" required>
  From quote.
</ParamField>

<ParamField body="wallet" type="string" required>
  Must match the quote wallet.
</ParamField>

<ParamField body="userId" type="string">
  Must not contradict the quote binding.
</ParamField>

<ParamField body="maxSlippageBps" type="integer">
  Default `100` (1%); maximum `5000`.
</ParamField>

<ResponseField name="orderId" type="string">
  Order session id for submit / verify.
</ResponseField>

<ResponseField name="instructions" type="array">
  Ordered Solana instructions (`programId`, base64 `data`, `accounts`).
</ResponseField>

<ResponseField name="expectedShares" type="string">
  Shares expected at build time.
</ResponseField>

<ResponseField name="recentBlockhash" type="string">
  Blockhash for transaction compilation.
</ResponseField>

Errors: `QUOTE_EXPIRED` · `QUOTE_STALE` · `UNAUTHORIZED` · `MARKET_NOT_FOUND` · `MARKET_NOT_IN_PRIMARY` · `AMOUNT_TOO_SMALL` · `INVALID_MARKET_PARAMS` · `RATE_LIMITED`.

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/primaryorderbuild/ \
    -H "X-Api-Key: pk_test_…" \
    -H "Content-Type: application/json" \
    -d '{
      "quoteId": "qt_abc123",
      "wallet": "Buyer111111111111111111111111111111111",
      "userId": "usr_acme",
      "maxSlippageBps": 100
    }'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "orderId": "ord_…",
    "quoteId": "qt_…",
    "wallet": "…",
    "marketId": "…",
    "side": "yes",
    "amountUsdc": "20.00",
    "expectedShares": "38.40",
    "feeUsdc": "0.40",
    "status": "built",
    "instructions": [
      {
        "programId": "…",
        "data": "<base64>",
        "accounts": [
          { "pubkey": "…", "isSigner": true, "isWritable": true }
        ]
      }
    ],
    "derived": { "event": "…", "vaultAuthority": "…" },
    "recentBlockhash": "…",
    "lastValidBlockHeight": 123,
    "expiresAt": "2026-09-04T16:28:00.000000Z",
    "blockhashExpiryHintSec": 60
  }
  ```
</ResponseExample>
