> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Claim creator fees

> Unsigned claim_creator_fees_usdc instructions for the creator of a graduated market with accumulated fees.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Separate from [Build win claim](/api-reference/claims/build) (`POST /claim/build/`), which redeems winning shares.

`wallet` must match the creator on the on-chain event. The creator-fee vault must belong to the same event and creator and have a nonzero `accumulated_fees` balance. The market must have **graduated**.

Compile a versioned transaction from `instructions` and `recentBlockhash`, sign with `wallet`, then broadcast on your RPC.

Creator-fee claim signatures are **not** accepted by [`POST /trades/`](/api-reference/trades/report) — attribution only covers primary buys and win claims.

<ParamField body="wallet" type="string" required>
  Market creator and transaction signer (base58).
</ParamField>

<ParamField body="marketId" type="string" required>
  Event / market address.
</ParamField>

<ResponseField name="claimableFeesUsdc" type="string">
  Accumulated fees in USDC base units (6 decimals), e.g. `"2500000"` = 2.50 USDC.
</ResponseField>

<ResponseField name="instructions" type="array">
  Ordered Solana instructions (may include create-ATA then `claim_creator_fees_usdc`).
</ResponseField>

<ResponseField name="derived" type="object">
  Relevant accounts (`creatorFeeVault`, `creatorFeeVaultTokenAccount`, `creatorTokenAccount`, `marketConfig`).
</ResponseField>

<ResponseField name="recentBlockhash" type="string">
  Blockhash for compilation.
</ResponseField>

<ResponseField name="lastValidBlockHeight" type="integer">
  Advisory validity height.
</ResponseField>

| Code                    | Description                                  |
| ----------------------- | -------------------------------------------- |
| `MARKET_NOT_FOUND`      | Event account missing or invalid             |
| `NOT_MARKET_CREATOR`    | Wallet or fee-vault ownership does not match |
| `MARKET_NOT_GRADUATED`  | Creator fees are not claimable yet           |
| `NO_CREATOR_FEES`       | Fee vault missing or zero accumulated fees   |
| `INVALID_MARKET_PARAMS` | Malformed keys or unexpected build failure   |

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/claim/creator-fees/build/ \
    -H "X-Api-Key: pk_test_…" \
    -H "Content-Type: application/json" \
    -d '{
      "wallet": "Creator1111111111111111111111111111111",
      "marketId": "EventPda11111111111111111111111111111"
    }'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "wallet": "…",
    "marketId": "…",
    "claimableFeesUsdc": "2500000",
    "instructions": [
      {
        "programId": "…",
        "data": "<base64>",
        "accounts": [
          { "pubkey": "…", "isSigner": true, "isWritable": true }
        ]
      }
    ],
    "derived": {
      "creatorFeeVault": "…",
      "creatorFeeVaultTokenAccount": "…",
      "creatorTokenAccount": "…",
      "marketConfig": "…"
    },
    "recentBlockhash": "…",
    "lastValidBlockHeight": 123
  }
  ```
</ResponseExample>
