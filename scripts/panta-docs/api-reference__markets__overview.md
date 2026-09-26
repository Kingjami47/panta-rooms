> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Create market

> Quote the USDC fee, build an unsigned transaction, then register after the wallet broadcasts.

Creates a USDC prediction market. Fee quotation, unsigned transaction construction, and post-broadcast registration are separate steps.

To **browse** existing markets, see the [Markets catalog](/api-reference/markets/catalog).

<Warning>
  Requires `canCreateMarkets: true` on the account (default on signup). Otherwise the API returns `{ "code": "CREATE_NOT_PERMITTED" }`.
</Warning>

<Steps>
  <Step title="Upload image (optional helper)">
    [`POST /markets/create/image-upload/`](/api-reference/markets/image-upload) — signed Cloudinary fields; upload the file yourself, then use `secure_url` as `imageUrl`.
  </Step>

  <Step title="Quote">
    [`POST /markets/create/quote/`](/api-reference/markets/quote) — validate params and `imageUrl`, reserve a session, return the creation fee.
  </Step>

  <Step title="Build">
    [`POST /markets/create/build/`](/api-reference/markets/build) — unsigned `VersionedTransaction` plus blockhash.
  </Step>

  <Step title="Sign and broadcast">
    Decode `transaction`, sign with `wallet`, send on your RPC. Panta does not broadcast.
  </Step>

  <Step title="Register">
    [`POST /markets/register/`](/api-reference/markets/register) — verify the on-chain create and write catalog / oracle metadata.
  </Step>
</Steps>

Sessions last about 5 minutes. Rebuild if the blockhash expires (\~60s). Do not change instruction accounts or fee amounts.

<Info>
  Every quote needs a catalog `imageUrl` on a host your product can display (e.g. Cloudinary via the [image upload](/api-reference/markets/image-upload) helper). **1024×1024** square is recommended. `startTime` must honor on-chain `minimumStartDelay` (typically 1 hour ahead) unless `eventInProgress` is set on a breaking market. Optional: `region`, `oracle`.
</Info>
