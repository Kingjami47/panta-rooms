> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Build create transaction

> Return an unsigned versioned transaction for the quoted create.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Decode `transaction`, sign with `wallet`, then broadcast. If the blockhash expires, call build again with a valid `createId` (or re-quote if the session expired).

<ParamField body="createId" type="string" required>
  From quote.
</ParamField>

<ParamField body="wallet" type="string">
  If set, must equal the wallet from quote.
</ParamField>

<ResponseField name="transaction" type="string">
  Base64-encoded unsigned `VersionedTransaction`.
</ResponseField>

<ResponseField name="recentBlockhash" type="string">
  Blockhash embedded in the transaction.
</ResponseField>

<ResponseField name="lastValidBlockHeight" type="integer">
  Last height at which the blockhash remains valid.
</ResponseField>

<ResponseField name="buildFingerprint" type="string">
  Integrity fingerprint checked at register.
</ResponseField>

<ResponseField name="derived" type="object">
  Account addresses referenced by the transaction (`event`, `vaultAuthority`, `marketConfig`, …).
</ResponseField>

Errors: `CREATE_EXPIRED` · `UNAUTHORIZED` · `INVALID_MARKET_PARAMS` · `RATE_LIMITED`.

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/markets/create/build/ \
    -H "X-Api-Key: pk_test_…" \
    -H "Content-Type: application/json" \
    -d '{"createId":"cr_abc123","wallet":"Creator1111111111111111111111111111111"}'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "createId": "cr_…",
    "expectedEventPda": "…",
    "transaction": "<base64 VersionedTransaction>",
    "recentBlockhash": "…",
    "lastValidBlockHeight": 123456789,
    "blockhashExpiryHintSec": 60,
    "buildFingerprint": "abc",
    "paymentUsdc": "50000000",
    "liquidityInjectionUsdc": "10000000",
    "platformRevenueUsdc": "40000000",
    "marketType": "standard",
    "derived": {
      "event": "…",
      "vaultAuthority": "…",
      "marketConfig": "…"
    },
    "expiresAt": "2026-09-04T16:26:00.000000Z"
  }
  ```
</ResponseExample>
