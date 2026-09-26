> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Markets catalog

> List and inspect public USDC markets, categories, and catalog trades.

Browse the public USDC market catalog. Auth: `X-Api-Key` or `Authorization: Bearer <access>`.

| Method | Path                          | Page                                                  |
| ------ | ----------------------------- | ----------------------------------------------------- |
| `GET`  | `/markets/`                   | [List markets](/api-reference/markets/list)           |
| `GET`  | `/markets/{marketId}/`        | [Get market](/api-reference/markets/get)              |
| `GET`  | `/markets/{marketId}/trades/` | [Market trades](/api-reference/markets/trades)        |
| `GET`  | `/categories/`                | [Categories](/api-reference/markets/categories)       |
| `GET`  | `/wallets/{wallet}/trades/`   | [Wallet trades](/api-reference/markets/wallet-trades) |

List rows do **not** live-RPC for prices (cost). Use [Get market](/api-reference/markets/get) for spot prices when RPC is available.

To **create** a market, see [Create market](/api-reference/markets/overview).
