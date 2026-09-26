> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Build win claim

> Unsigned claim_win_usdc instructions for a resolved market when the wallet holds winning shares.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Use [List positions](/api-reference/positions) to check `claimable` first. This endpoint re-validates eligibility on-chain and fails closed if preconditions are not met.

For market **creator fees** (graduated markets), use [Claim creator fees](/api-reference/claims/creator-fees) instead.

Compile a versioned transaction from `instructions` and `recentBlockhash`, sign with `wallet`, then broadcast. Optionally [report the trade](/api-reference/trades/report) for volume attribution (`kind: claim`).

<ParamField body="wallet" type="string" required>
  Claimant and transaction signer.
</ParamField>

<ParamField body="marketId" type="string" required>
  Event / market address.
</ParamField>

<ResponseField name="outcome" type="string">
  Winning outcome label.
</ResponseField>

<ResponseField name="winningShares" type="string">
  Shares eligible to claim.
</ResponseField>

<ResponseField name="instructions" type="array">
  Ordered Solana instructions.
</ResponseField>

<ResponseField name="derived" type="object">
  Relevant accounts (`winClaim`, `positionPda`, `vaultAuthority`).
</ResponseField>

| Code                    | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `MARKET_NOT_FOUND`      | Market account missing or undecodable                    |
| `NOT_CLAIMABLE`         | One or more claim preconditions failed                   |
| `INVALID_MARKET_PARAMS` | Invalid `wallet` or `marketId`, or configuration failure |

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/claim/build/ \
    -H "X-Api-Key: pk_test_…" \
    -H "Content-Type: application/json" \
    -d '{
      "wallet": "Buyer111111111111111111111111111111111",
      "marketId": "EventPda11111111111111111111111111111"
    }'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "wallet": "…",
    "marketId": "…",
    "outcome": "YES",
    "winningShares": "38",
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
      "winClaim": "…",
      "positionPda": "…",
      "vaultAuthority": "…"
    },
    "recentBlockhash": "…",
    "lastValidBlockHeight": 123
  }
  ```
</ResponseExample>
