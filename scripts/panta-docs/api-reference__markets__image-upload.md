> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Upload market image

> Request a scoped Cloudinary signature, then upload image bytes directly to Cloudinary for use as imageUrl.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Optional helper when you do not host images yourself. Image **bytes never pass through Panta** — only a short-lived signed upload form is returned.

Requires `canCreateMarkets` (same as create quote). Rate-limited under the `upload` family.

## Flow

1. `POST /markets/create/image-upload/` with your API key (empty JSON body is fine).
2. Build `multipart/form-data` with every key in `fields` **plus** `file` (the image).
3. `POST` that form to `uploadUrl` (Cloudinary).
4. Take Cloudinary's `secure_url` and pass it as `imageUrl` on [`POST /markets/create/quote/`](/api-reference/markets/quote).

Prefer a square **1024×1024** asset. Do not expose or send the Cloudinary API secret (it never appears in this response).

<ResponseField name="uploadUrl" type="string">
  Cloudinary image upload endpoint.
</ResponseField>

<ResponseField name="publicId" type="string">
  Full public id reserved for this upload.
</ResponseField>

<ResponseField name="expiresAt" type="string">
  ISO timestamp when the signature expires (\~5 minutes).
</ResponseField>

<ResponseField name="fields" type="object">
  Signed form fields (`api_key`, `timestamp`, `signature`, `upload_preset`, `folder`, `public_id`, `overwrite`, …). Append these with `file` when posting to `uploadUrl`.
</ResponseField>

Errors: `UPLOAD_NOT_CONFIGURED` (503) · `CREATE_NOT_PERMITTED` · `UNAUTHORIZED` · `RATE_LIMITED` · `INTERNAL_ERROR`.

<RequestExample>
  ```bash cURL theme={null}
  # 1) Get signed fields
  curl -sS -X POST https://live-api.panta.market/api/v1/markets/create/image-upload/ \
    -H "X-Api-Key: pk_test_…" \
    -H "Content-Type: application/json" \
    -d '{}'

  # 2) Upload file to Cloudinary (example — use fields from step 1)
  curl -sS -X POST "https://api.cloudinary.com/v1_1/<cloud>/image/upload" \
    -F "file=@./market-1024.png" \
    -F "api_key=…" \
    -F "timestamp=…" \
    -F "signature=…" \
    -F "upload_preset=…" \
    -F "folder=…" \
    -F "public_id=…" \
    -F "overwrite=false"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "uploadUrl": "https://api.cloudinary.com/v1_1/example/image/upload",
    "publicId": "balr-market/events/usr_123/abcdef",
    "expiresAt": "2026-09-08T12:05:00Z",
    "fields": {
      "api_key": "…",
      "timestamp": 1788868800,
      "signature": "…",
      "upload_preset": "market-signed",
      "folder": "balr-market/events",
      "public_id": "usr_123/abcdef",
      "overwrite": "false"
    }
  }
  ```
</ResponseExample>
