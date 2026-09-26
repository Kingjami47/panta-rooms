> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Quickstart

> Register, mint an API key, call whoami, then create or buy.

## 1. Create an account and API key

Register (or log in) to get a JWT, then mint a key:

```bash theme={null}
# Signup
curl -sS -X POST https://live-api.panta.market/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-strong-password","name":"Acme"}'

# Create a test key (use access from the response)
curl -sS -X POST https://live-api.panta.market/api/v1/account/keys/ \
  -H "Authorization: Bearer <access>" \
  -H "Content-Type: application/json" \
  -d '{"env":"test","name":"ci"}'
```

Or use **Try it** on the [Register](/api-reference/auth/register) and [Create API key](/api-reference/account/create-key) pages (playground → `live-api.panta.market`).

Keys look like `pk_test_…` or `pk_live_…` (both work on the public API).

The plaintext `secret` is shown **once**. Store it in your backend. Never put it in a query string, mobile binary, or frontend bundle.

See [Authentication](/guides/authentication) and [Create API key](/api-reference/account/create-key).

## 2. Call the API

Authenticated routes accept `X-Api-Key` **or** `Authorization: Bearer <access>`. Prefer the API key for product calls. Trailing slashes are required.

```bash theme={null}
curl -sS https://live-api.panta.market/api/v1/account/ \
  -H "X-Api-Key: pk_test_…"
```

A successful response looks like:

```json theme={null}
{
  "userId": "usr_…",
  "email": "you@example.com",
  "name": "Acme",
  "status": "active",
  "canCreateMarkets": true,
  "createdAt": "2026-09-04T12:00:00.000000Z",
  "apiKeyId": "key_…"
}
```

`GET /whoami/` is an alias of `GET /account/`.

<Info>
  `canCreateMarkets` defaults to `true` on signup. Operators may disable it; then create routes return `CREATE_NOT_PERMITTED`.
</Info>

## 3. Pick a flow

<Steps>
  <Step title="Browse markets">
    [List](/api-reference/markets/list) → [get detail](/api-reference/markets/get) → optional [market trades](/api-reference/markets/trades).
  </Step>

  <Step title="Create a market">
    Optional [image upload](/api-reference/markets/image-upload) → [quote](/api-reference/markets/quote) → [build](/api-reference/markets/build) → wallet signs → you broadcast → [register](/api-reference/markets/register).
  </Step>

  <Step title="Buy primary shares">
    [Quote](/api-reference/orders/quote) → [build](/api-reference/orders/build) → compile + sign → broadcast → [submit](/api-reference/orders/submit) / [verify](/api-reference/orders/verify).
  </Step>

  <Step title="Read and claim">
    [Positions](/api-reference/positions) for a wallet. When `claimable` is true, [build a win claim](/api-reference/claims/build) and optionally [report the trade](/api-reference/trades/report). Market creators can [claim creator fees](/api-reference/claims/creator-fees) after graduation (not reported via `/trades/`).
  </Step>
</Steps>

## 4. Handle errors

Failures return `{ "code": "…", "message": "…" }` (and sometimes `field` / `fields`). Switch on `code`, not only HTTP status. See [Errors](/guides/errors).
