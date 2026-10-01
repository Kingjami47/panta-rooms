#!/usr/bin/env bash
# Start Vercel OAuth device flow (endpoints discovered live from
# https://vercel.com/.well-known/openid-configuration — issuer vercel.com,
# NOT oidc.vercel.com). Client: Vercel CLI's public client_id.
# Only the user_code (safe by design) is printed. The device_code (polling
# secret) is stored 0600 under .zscripts and never printed.
set -uo pipefail
Z=/home/z/my-project/.zscripts
mkdir -p "$Z"; chmod 700 "$Z" 2>/dev/null || true
umask 077
DEVICE_EP=$(curl -s -m 20 https://vercel.com/.well-known/openid-configuration | python3 -c "import json,sys;print(json.load(sys.stdin)['device_authorization_endpoint'])")
TOKEN_EP=$(curl -s -m 20 https://vercel.com/.well-known/openid-configuration | python3 -c "import json,sys;print(json.load(sys.stdin)['token_endpoint'])")
printf '{"token_endpoint":"%s"}\n' "$TOKEN_EP" > "$Z/vercel-oidc.json"

HTTP=$(curl -s -o "$Z/vercel-device.json" -w '%{http_code}' -X POST "$DEVICE_EP" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "client_id=cl_HYyOPBNtFMfHhaUn9L4QPfTZz6TP47bp")
echo "vercel http status: $HTTP"

python3 - "$Z/vercel-device.json" << 'PYEOF'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception as e:
    print("session parse error (non-JSON response):", e)
    sys.exit(1)
if "error" in d:
    print("VERCEL ERROR:", d.get("error"), "-", d.get("error_description", ""))
    sys.exit(2)
print("user_code:             ", d.get("user_code"))
print("verification_uri:      ", d.get("verification_uri") or "https://vercel.com/oauth/device")
print("expires_in_seconds:    ", d.get("expires_in"))
print("poll_interval_seconds: ", d.get("interval"))
print("device_code_stored:    ", bool(d.get("device_code")))
PYEOF
