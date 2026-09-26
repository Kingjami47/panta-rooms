> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Categories

> Allowlist of market categories for create and list filters.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

Accepts `X-Api-Key` or `Authorization: Bearer <access>`.

Use these values for create-quote `category` and [List markets](/api-reference/markets/list) `category` query.

<ResponseField name="categories" type="string[]">
  Allowed category slugs.
</ResponseField>

<RequestExample>
  ```bash cURL theme={null}
  curl https://live-api.panta.market/api/v1/categories/ \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "categories": [
      "sports",
      "crypto",
      "politics",
      "entertainment",
      "finance",
      "science",
      "world",
      "other"
    ]
  }
  ```
</ResponseExample>
