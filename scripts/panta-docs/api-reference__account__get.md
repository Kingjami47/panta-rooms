> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Get account

> Return the account bound to the current API key or signup JWT.

<ParamField header="X-Api-Key" type="string" required>
  API key (`pk_test_…` or `pk_live_…`). Or use `Authorization: Bearer <access>` instead — see [Authentication](/guides/authentication).
</ParamField>

`GET /whoami/` is an alias of this endpoint (GET only). Accepts `X-Api-Key` or `Authorization: Bearer <access>`.

<ResponseField name="userId" type="string">
  Account identifier (`usr_…`).
</ResponseField>

<ResponseField name="email" type="string">
  Login email.
</ResponseField>

<ResponseField name="name" type="string">
  Display name.
</ResponseField>

<ResponseField name="status" type="string">
  `active` or `suspended`.
</ResponseField>

<ResponseField name="canCreateMarkets" type="boolean">
  Whether create-market endpoints are allowed (defaults to `true` on signup).
</ResponseField>

<ResponseField name="createdAt" type="string">
  ISO-8601 timestamp.
</ResponseField>

<ResponseField name="apiKeyId" type="string">
  Identifier of the key used for this request (`key_…`), when authenticated with an API key.
</ResponseField>

<RequestExample>
  ```bash cURL theme={null}
  curl https://live-api.panta.market/api/v1/account/ \
    -H "X-Api-Key: pk_test_…"
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
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
</ResponseExample>
