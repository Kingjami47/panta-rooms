> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Login

> Exchange email and password for access + refresh JWTs.

Public endpoint — no API key required. Response envelope matches [Register](/api-reference/auth/register).

<ParamField body="email" type="string" required>
  Account email.
</ParamField>

<ParamField body="password" type="string" required>
  Account password.
</ParamField>

Invalid credentials return `401` `{ "code": "UNAUTHORIZED" }`. Suspended accounts are also unauthorized.

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/auth/token/ \
    -H "Content-Type: application/json" \
    -d '{"email":"you@example.com","password":"a-strong-password"}'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "userId": "usr_…",
    "email": "you@example.com",
    "name": "Acme",
    "access": "<jwt>",
    "refresh": "<jwt>"
  }
  ```
</ResponseExample>
