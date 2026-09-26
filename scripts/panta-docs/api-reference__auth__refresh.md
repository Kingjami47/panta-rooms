> ## Documentation Index
> Fetch the complete documentation index at: https://docs.panta.market/llms.txt
> Use this file to discover all available pages before exploring further.

# Refresh token

> Rotate a refresh token and obtain a new access token.

Public endpoint — no API key required. Refresh tokens are **rotated**: the previous refresh token is invalidated.

<ParamField body="refresh" type="string" required>
  Current refresh JWT.
</ParamField>

<ResponseField name="access" type="string">
  New access JWT.
</ResponseField>

<ResponseField name="refresh" type="string">
  New refresh JWT (rotated).
</ResponseField>

Invalid or expired refresh tokens return `401` `{ "code": "UNAUTHORIZED" }`.

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST https://live-api.panta.market/api/v1/auth/token/refresh/ \
    -H "Content-Type: application/json" \
    -d '{"refresh":"<jwt>"}'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "access": "<jwt>",
    "refresh": "<jwt>"
  }
  ```
</ResponseExample>
