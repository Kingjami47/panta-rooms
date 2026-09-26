> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Register

> Create an account and receive access + refresh JWTs.

Public endpoint — no API key required.

<ParamField body="email" type="string" required>
  Login email. Normalized and unique.
</ParamField>

<ParamField body="password" type="string" required>
  Password (min 8, max 128). Subject to Django password validators.
</ParamField>

<ParamField body="name" type="string">
  Optional display name. Defaults from the email local-part when omitted.
</ParamField>

<ResponseField name="userId" type="string">
  New account id (`usr_…`).
</ResponseField>

<ResponseField name="email" type="string">
  Registered email.
</ResponseField>

<ResponseField name="name" type="string">
  Display name.
</ResponseField>

<ResponseField name="access" type="string">
  JWT access token.
</ResponseField>

<ResponseField name="refresh" type="string">
  JWT refresh token.
</ResponseField>

Duplicate emails return `409` `{ "code": "EMAIL_TAKEN" }`.

`canCreateMarkets` defaults to `true` on the new account.

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/auth/register/ \
    -H "Content-Type: application/json" \
    -d '{"email":"you@example.com","password":"a-strong-password","name":"Acme"}'
  ```
</RequestExample>

<ResponseExample>
  ```json 201 theme={null}
  {
    "userId": "usr_…",
    "email": "you@example.com",
    "name": "Acme",
    "access": "<jwt>",
    "refresh": "<jwt>"
  }
  ```
</ResponseExample>
