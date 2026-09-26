> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Errors

> Error envelope, codes, rate limits, and retry rules.

Failed requests return JSON:

```json theme={null}
{
  "code": "INVALID_MARKET_PARAMS",
  "message": "startTime must be at least 3600s ahead of now",
  "field": "startTime"
}
```

Or, for serializer field errors:

```json theme={null}
{
  "code": "INVALID_MARKET_PARAMS",
  "message": "imageUrl: This field is required.",
  "fields": { "imageUrl": ["This field is required."] }
}
```

Switch on `code`. Use `message` / `field` / `fields` to show what failed. HTTP status is the class of failure, not a replacement for `code`.

## HTTP status

| Status | Meaning                                                   |
| ------ | --------------------------------------------------------- |
| `400`  | Validation or business-rule failure                       |
| `401`  | Missing or invalid credentials, or wallet binding failure |
| `403`  | Authenticated but not permitted                           |
| `404`  | Referenced transaction or market not found                |
| `409`  | Conflict (email already registered)                       |
| `413`  | Request body exceeds the size limit                       |
| `429`  | Rate limit exceeded                                       |
| `500`  | Internal error (`INTERNAL_ERROR` when applicable)         |

## Codes

| Code                    | Typical endpoints       | Description                                                                                               |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `UNAUTHORIZED`          | Any authenticated route | Invalid or missing API key or signup JWT; or wallet does not match the bound session                      |
| `EMAIL_TAKEN`           | `POST /auth/register/`  | Email already registered                                                                                  |
| `CREATE_NOT_PERMITTED`  | Create market           | Account has create permission disabled                                                                    |
| `FORBIDDEN`             | Restricted routes       | Operation not allowed                                                                                     |
| `INVALID_MARKET_PARAMS` | Most writes             | Malformed fields, invalid pubkeys, illegal times, or unavailable config                                   |
| `DUPLICATE_MARKET`      | Create quote            | Creator + question already produce a market                                                               |
| `CREATE_EXPIRED`        | Create build / register | `createId` missing, expired, or consumed                                                                  |
| `QUOTE_EXPIRED`         | Primary buy             | `quoteId` or `orderId` expired                                                                            |
| `QUOTE_STALE`           | Primary build           | Curve moved beyond `maxSlippageBps`                                                                       |
| `AMOUNT_TOO_SMALL`      | Primary quote           | Amount below minimum fill                                                                                 |
| `MARKET_NOT_FOUND`      | Buy, claim              | Event account missing or undecodable                                                                      |
| `MARKET_NOT_IN_PRIMARY` | Primary quote           | Market is not accepting primary buys                                                                      |
| `NOT_CLAIMABLE`         | Win claim build         | Win-claim preconditions not satisfied                                                                     |
| `NOT_MARKET_CREATOR`    | Creator-fee claim       | Wallet is not the market creator / fee-vault owner                                                        |
| `MARKET_NOT_GRADUATED`  | Creator-fee claim       | Market has not graduated; fees not claimable yet                                                          |
| `NO_CREATOR_FEES`       | Creator-fee claim       | Fee vault missing or zero accumulated fees                                                                |
| `UPLOAD_NOT_CONFIGURED` | Image upload            | Cloudinary upload signing is unavailable (503)                                                            |
| `TX_NOT_FOUND`          | Register, trades        | Signature not observed at required commitment                                                             |
| `TX_FAILED`             | Register, trades        | On-chain transaction failed                                                                               |
| `TX_MISMATCH`           | Register, trades, buy   | Tx does not match expected wallet, market, or program (also: reporting a creator-fee claim to `/trades/`) |
| `TX_FEE_MISMATCH`       | Register, trades        | On-chain amount does not match quoted fee or size                                                         |
| `RATE_LIMITED`          | Any                     | Client exceeded the rate limit                                                                            |
| `INTERNAL_ERROR`        | Any                     | Unexpected server failure                                                                                 |

## Rate limits

Headers on authenticated responses:

| Header                  | Description                        |
| ----------------------- | ---------------------------------- |
| `X-RateLimit-Limit`     | Max requests in the current window |
| `X-RateLimit-Remaining` | Remaining in the window            |
| `X-RateLimit-Reset`     | Window reset (UTC, ISO-8601)       |
| `Retry-After`           | Seconds to wait on `429`           |

Defaults per account (and optionally per IP). Deployments may override.

| Family      | Example routes                                      | Default max / window |
| ----------- | --------------------------------------------------- | -------------------- |
| `read`      | Account, catalog reads                              | 120 / 60s            |
| `positions` | `GET /positions/`                                   | 60 / 60s             |
| `quote`     | Create / primary quote                              | 30 / 60s             |
| `build`     | Create / primary / claim build (win + creator fees) | 20 / 60s             |
| `register`  | Register, trade report, submit, auth                | 40 / 60s             |
| `upload`    | `POST /markets/create/image-upload/`                | 10 / 60s             |

On `429`, honor `Retry-After` and back off with jitter.

## Session lifetimes

| Resource                    | Typical TTL   |
| --------------------------- | ------------- |
| Create session (`createId`) | \~5 minutes   |
| Build blockhash hint        | \~60 seconds  |
| Primary quote (`quoteId`)   | \~90 seconds  |
| Primary order (`orderId`)   | \~120 seconds |
