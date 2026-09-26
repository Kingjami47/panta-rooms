> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Primary buy

> Quote a YES/NO fill on the bonding curve, build instructions, then submit the broadcast signature.

Purchases YES or NO shares during a market’s **primary** phase. Amounts are human-readable **decimal USDC strings** (for example `"20.00"`), not base units.

<Steps>
  <Step title="Quote">
    [`POST /primaryorderquote/`](/api-reference/orders/quote) — simulate fill and fee, open a `quoteId` session (\~90s).
  </Step>

  <Step title="Build">
    [`POST /primaryorderbuild/`](/api-reference/orders/build) — unsigned instructions. Rejects if the curve moved beyond `maxSlippageBps`.
  </Step>

  <Step title="Compile, sign, broadcast">
    Compile a versioned transaction from `instructions` + `recentBlockhash`. Sign with `wallet`. Send on your RPC.
  </Step>

  <Step title="Submit / verify">
    [`POST /primaryordersubmit/`](/api-reference/orders/submit) registers the signature without waiting. [`POST /primaryorderverify/`](/api-reference/orders/verify) returns current status.
  </Step>
</Steps>

Optional `X-User-Id` (or `userId` in the body) is used for attribution. When present, build may include an SPL Memo instruction.
