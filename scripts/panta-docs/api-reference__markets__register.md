> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Register market

> Verify the confirmed on-chain create and write catalog / oracle metadata.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Verification is fail-closed (transaction presence and success, program, accounts, fee match). Repeating the same `createId` and `signature` is idempotent. After success, `createId` cannot register a different signature.

<ParamField body="createId" type="string" required>
  From quote.
</ParamField>

<ParamField body="signature" type="string" required>
  Base58 transaction signature from broadcast.
</ParamField>

<ResponseField name="marketId" type="string">
  Event address used as the market id in later APIs.
</ResponseField>

<ResponseField name="status" type="string">
  `registered` on success.
</ResponseField>

<ResponseField name="images" type="string[]">
  Catalog image URLs (always one entry from quoted `imageUrl`).
</ResponseField>

Errors: `CREATE_EXPIRED` · `TX_NOT_FOUND` · `TX_FAILED` · `TX_MISMATCH` · `TX_FEE_MISMATCH` · `INVALID_MARKET_PARAMS` · `RATE_LIMITED`.

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/markets/register/ \
    -H "X-Api-Key: pk_test_…" \
    -H "Content-Type: application/json" \
    -d '{"createId":"cr_abc123","signature":"5VEJv1R…base58Signature"}'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "createId": "cr_…",
    "marketId": "<eventPda>",
    "status": "registered",
    "signature": "…",
    "category": "crypto",
    "title": "ETH above 5k?",
    "images": ["https://cdn.example.com/markets/eth-5k-1024.webp"]
  }
  ```
</ResponseExample>
