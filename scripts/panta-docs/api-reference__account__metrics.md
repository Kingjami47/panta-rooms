> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Metrics

> Summary plus recent create and trade rows for the account.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Accepts `X-Api-Key` or `Authorization: Bearer <access>`.

Summary covers **this account only**: create sessions, attributed trade volume, and API keys. Fees are not summed here — see [Estimating protocol fees](#estimating-protocol-fees-client-side).

<ParamField query="limit" type="integer" default="50">
  Max recent rows per list (capped at `200`).
</ParamField>

<ResponseField name="summary" type="object">
  Aggregates for this account.
</ResponseField>

| Summary path | Fields                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `creates`    | `total`, `byStatus` (`pending`, `built`, `registered`, …)                                           |
| `trades`     | `total`, `volumeUsdcBase` (sum of attributed `amount_usdc`, base units), `byKind` (`buy` / `claim`) |
| `keys`       | `active`, `revoked`, `total`                                                                        |

<ResponseField name="creates" type="array">
  Recent create-session rows.
</ResponseField>

| Create field              | Description                                               |
| ------------------------- | --------------------------------------------------------- |
| `createId`                | Create session id                                         |
| `wallet`                  | Creator / fee payer                                       |
| `eventPda`                | Expected market id                                        |
| `signature`               | Create tx when registered                                 |
| `status`                  | `pending` \| `built` \| `registered` \| …                 |
| `paymentUsdc`             | Creation fee as human decimal (e.g. `"50.00"`)            |
| `paymentUsdcBase`         | Same fee as integer base units string (e.g. `"50000000"`) |
| `userId` / `apiKeyId`     | Attribution when present                                  |
| `createdAt` / `updatedAt` | ISO timestamps                                            |

<ResponseField name="trades" type="array">
  Recent [attributed](/api-reference/trades/report) rows (not full market tape).
</ResponseField>

| Trade field                             | Description                                   |
| --------------------------------------- | --------------------------------------------- |
| `signature`                             | On-chain signature                            |
| `wallet` / `marketId` / `side` / `kind` | Attribution fields (`kind`: `buy` \| `claim`) |
| `amountUsdc`                            | Size as human decimal (e.g. `"20.00"`)        |
| `amountUsdcBase`                        | Size as integer base units string             |
| `status`                                | Typically `processed`                         |
| `createdAt`                             | ISO timestamp                                 |

## Estimating protocol fees (client-side)

Metrics do **not** return trading fees. Primary buys charge on-chain:

```text theme={null}
fee ≈ amountUsdc × primaryFeeBps / 10_000
```

`primaryFeeBps` comes from on-chain `MarketConfig` (commonly **200** = 2%). For a rough partner estimate from attributed **buy** volume only:

```text theme={null}
estFeesUsdcBase ≈ volumeUsdcBase × primaryFeeBps / 10_000
```

Ignore `claim` volume for this estimate. Unreported buys are not in `volumeUsdcBase`.

<RequestExample>
  ```bash cURL theme={null}
  curl "https://live-api.panta.market/api/v1/account/metrics/?limit=50" \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "summary": {
      "creates": { "total": 1, "byStatus": { "registered": 1 } },
      "trades": { "total": 2, "volumeUsdcBase": 40000000, "byKind": { "buy": 2 } },
      "keys": { "active": 1, "revoked": 0, "total": 1 }
    },
    "creates": [
      {
        "createId": "cr_…",
        "wallet": "…",
        "eventPda": "…",
        "signature": "…",
        "status": "registered",
        "paymentUsdc": "50.00",
        "paymentUsdcBase": "50000000",
        "createdAt": "2026-09-04T12:00:00.000000Z",
        "updatedAt": "2026-09-04T12:05:00.000000Z"
      }
    ],
    "trades": [
      {
        "signature": "5VEJv1R…",
        "wallet": "…",
        "marketId": "…",
        "side": "yes",
        "kind": "buy",
        "amountUsdc": "20.00",
        "amountUsdcBase": "20000000",
        "status": "processed",
        "createdAt": "2026-09-04T12:00:00.000000Z"
      }
    ]
  }
  ```
</ResponseExample>
