> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Authentication

> Signup JWT, API keys, environments, headers, and create-market permission.

One account owns both login (JWT) and API keys. On authenticated routes, send **either** credential — they are interchangeable.

| Surface                       | Auth                                                |
| ----------------------------- | --------------------------------------------------- |
| Signup / login / refresh      | Public (`/auth/*`)                                  |
| Account, keys, product routes | `X-Api-Key` **or** `Authorization: Bearer <access>` |

Prefer `X-Api-Key` for server-to-server product calls (create → buy → trades). JWT is fine for dashboards and the same product routes when a user session is available.

## Try it in these docs

API reference pages include Mintlify’s interactive playground, pointed at **production**:

`https://live-api.panta.market/api/v1`

Suggested path:

1. [Register](/api-reference/auth/register) or [Login](/api-reference/auth/token) → **Send** (no auth header).
2. Copy `access` from the response.
3. [Create API key](/api-reference/account/create-key) → paste the access token into **Authorization** (Bearer) → **Send**. Copy the one-time `secret` (`pk_test_…`).
4. On any other endpoint (for example [Get account](/api-reference/account/get)), paste that secret into the **`X-Api-Key`** field → **Send**.

Playground traffic is proxied by Mintlify, so you do not need CORS changes. Trailing slashes are already in each path.

## Signup, login, refresh

| Endpoint                                                   | Purpose                                   |
| ---------------------------------------------------------- | ----------------------------------------- |
| [`POST /auth/register/`](/api-reference/auth/register)     | Create account → JWT pair                 |
| [`POST /auth/token/`](/api-reference/auth/token)           | Email + password → JWT pair               |
| [`POST /auth/token/refresh/`](/api-reference/auth/refresh) | Rotate refresh → new access (and refresh) |

Typical flow: register or log in → [`POST /account/keys/`](/api-reference/account/create-key) with Bearer → call product routes with `X-Api-Key`.

## Headers

```bash theme={null}
curl https://live-api.panta.market/api/v1/account/ \
  -H "X-Api-Key: pk_test_…"
```

Or with a signup JWT:

```bash theme={null}
curl https://live-api.panta.market/api/v1/account/ \
  -H "Authorization: Bearer <access>"
```

| Header          | Required             | Description                                                    |
| --------------- | -------------------- | -------------------------------------------------------------- |
| `X-Api-Key`     | One of key or Bearer | `pk_test_…` or `pk_live_…`. Preferred for product routes.      |
| `Authorization` | One of key or Bearer | `Bearer <access>` from signup or login.                        |
| `Content-Type`  | On POST/PATCH        | `application/json`                                             |
| `X-Request-Id`  | No                   | Correlation id; echoed when valid                              |
| `X-User-Id`     | No                   | Optional attribution id; defaults to the authenticated account |

API keys must be sent in `X-Api-Key`. Keys in query parameters are rejected with `401` and `{ "code": "UNAUTHORIZED" }`.

## Response headers

Successful `/api/…` responses may include:

| Header                                      | When                       | Notes                                    |
| ------------------------------------------- | -------------------------- | ---------------------------------------- |
| `X-Request-Id`                              | Always (echo or generated) | Correlate logs                           |
| `X-Powered-By`                              | **2xx** API responses      | Value `Panta` — branding for integrators |
| `X-RateLimit-Limit` / `Remaining` / `Reset` | Authenticated routes       | See [Errors](/guides/errors#rate-limits) |
| `Retry-After`                               | On `429`                   | Seconds to wait                          |

Browser apps that call the API **cross-origin** can only read headers listed in CORS `Access-Control-Expose-Headers` (today: request id, rate limits, `Retry-After`). `X-Powered-By` is always visible to **server-side** clients (curl, backends, proxies). To show “Powered by Panta” in a browser SPA, either call via your backend or hardcode the badge.

## API key prefixes

| Prefix     | Notes                      |
| ---------- | -------------------------- |
| `pk_test_` | Accepted on the public API |
| `pk_live_` | Accepted on the public API |

A rejected key is the same `401 UNAUTHORIZED` as a bad secret — the API does not say which check failed.

## Key lifecycle

Create, list, and revoke keys via the [Account](/api-reference/account/list-keys) resource. The plaintext `secret` appears **only** on create.

## Create-market permission

`canCreateMarkets` defaults to `true` on signup. Operators may disable it; then create endpoints return:

```json theme={null}
{ "code": "CREATE_NOT_PERMITTED" }
```

## Do not send

| Content                            | Why                                          |
| ---------------------------------- | -------------------------------------------- |
| Wallet private keys / seed phrases | Signing is client-side                       |
| API keys in URLs                   | Rejected                                     |
| Oracle feed identifiers            | Derived server-side from resolution metadata |
