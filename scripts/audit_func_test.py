#!/usr/bin/env python3
"""Panta Rooms functional + security audit tests (local dev server).
Covers: market/room creation, comments, reactions, leaderboard, plus
security probes for the findings from static review."""
import json, time, urllib.request, urllib.error, sys

BASE = "http://localhost:3000"
PASS, FAIL = [], []

def call(method, path, body=None, headers=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=15) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}

def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(f"{'✅' if cond else '❌'} {name}" + (f" — {detail}" if detail and not cond else ""))

ts = int(time.time())
WALLET_A = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin" + "A"  # 44-char base58-ish
WALLET_A = WALLET_A[:44]
WALLET_B = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"      # classic test pubkey

print("=== 1. MARKET / ROOM CREATION ===")
mid = f"demo:audit-{ts}"
st, room = call("POST", "/api/rooms", {
    "marketId": mid, "title": "Audit Room: Will tests pass?", "description": "Functional audit room",
    "category": "crypto", "creatorName": "Auditor", "creatorWallet": WALLET_A, "demo": True,
})
check("create room 200", st == 200, f"st={st} {room}")
check("room echoes creator wallet", room.get("room", {}).get("creatorWallet") == WALLET_A)
st2, dup = call("POST", "/api/rooms", {
    "marketId": mid, "title": "HIJACKED TITLE", "description": "hijack", "category": "sports",
    "creatorName": "Attacker", "creatorWallet": WALLET_B, "demo": True,
})
check("SECURITY: stranger cannot hijack room metadata",
      dup.get("room", {}).get("title") != "HIJACKED TITLE", f"st={st2} title now={dup.get('room',{}).get('title')!r}")

print("=== 2. COMMENTS ===")
st, missing = call("POST", f"/api/rooms/{mid}/comments", {"body": "hi", "wallet": WALLET_A})  # counts as comment #1
st, c1 = call("POST", f"/api/rooms/{mid}/comments",
              {"body": "YES — tests will pass.", "wallet": WALLET_A})
check("comment with wallet 200", st == 200 and c1.get("comment", {}).get("body"), f"st={st} {c1}")
st, c2 = call("POST", f"/api/rooms/{mid}/comments", {"body": "NO — something always breaks.", "wallet": WALLET_B})
st, c3 = call("POST", f"/api/rooms/{mid}/comments", {"body": "Guest take, no wallet."})
check("guest comment 200", st == 200 and c3.get("comment", {}).get("displayName") == "Guest", f"st={st}")
# impersonation probe: attacker posts with wallet A but different name
st, imp = call("POST", f"/api/rooms/{mid}/comments",
               {"body": "impersonation", "wallet": WALLET_A, "displayName": "King Jami"})
check("SECURITY: wallet present → client displayName not trusted",
      imp.get("comment", {}).get("displayName") != "King Jami",
      f"displayName={imp.get('comment',{}).get('displayName')!r}")
# edge cases
st, e1 = call("POST", f"/api/rooms/{mid}/comments", {"body": "   "})
check("empty comment → 400", st == 400, f"st={st}")
st, e2 = call("POST", f"/api/rooms/{mid}/comments", {"body": "x" * 501})
check("501-char comment → 400", st == 400, f"st={st}")
st, e3 = call("POST", "/api/rooms/demo:does-not-exist/comments", {"body": "hi"})
check("comment on missing room → 404", st == 404, f"st={st}")
st, e4 = call("POST", f"/api/rooms/{mid}/comments", {"body": "<script>alert(1)</script>", "wallet": WALLET_B})
check("script-tag comment accepted but stored raw (React escapes on render)", st == 200)
if e4.get("comment", {}).get("id"):
    call("POST", f"/api/rooms/{mid}/reactions", {"commentId": e4["comment"]["id"], "emoji": "🚨", "voter": WALLET_A})
# listing
st, lst = call("GET", f"/api/rooms/{mid}/comments")
comments = lst.get("comments", [])
check("GET comments returns 6", len(comments) == 6, f"got {len(comments)}")
check("newest first ordering",
      len(comments) >= 2 and comments[0]["createdAt"] >= comments[-1]["createdAt"])
xss_stored = next((c for c in comments if "script" in c["body"]), None)
check("reactions aggregated per comment", any(c["reactions"].get("🚨") == 1 for c in comments), json.dumps([c.get("reactions") for c in comments]))

print("=== 3. REACTIONS ===")
target = next((c for c in comments if c["body"].startswith("YES")), None)
cid = target["id"]
st, r1 = call("POST", f"/api/rooms/{mid}/reactions", {"commentId": cid, "emoji": "🔥", "voter": WALLET_B})
check("reaction toggle on → count 1", r1.get("counts", {}).get("🔥") == 1, json.dumps(r1.get("counts", {})))
st, r2 = call("POST", f"/api/rooms/{mid}/reactions", {"commentId": cid, "emoji": "🔥", "voter": WALLET_B})
check("reaction toggle off → count 0", r2.get("counts", {}).get("🔥") is None, json.dumps(r2.get("counts", {})))
st, r3 = call("POST", f"/api/rooms/{mid}/reactions", {"commentId": "nonexistent-id", "emoji": "🔥", "voter": WALLET_B})
check("SECURITY: reaction to foreign/invalid commentId rejected",
      st >= 400 or r3.get("toggled") is not True, f"st={st} body={r3}")
# cross-room probe: create room 2 with its own comment, then try reacting to it via room 1's endpoint
mid2 = f"demo:audit-b-{ts}"
call("POST", "/api/rooms", {"marketId": mid2, "title": "Audit Room B", "demo": True, "creatorWallet": WALLET_A})
st, cb2 = call("POST", f"/api/rooms/{mid2}/comments", {"body": "room B comment", "wallet": WALLET_A})
st, rx = call("POST", f"/api/rooms/{mid}/reactions",
              {"commentId": cb2.get("comment", {}).get("id"), "emoji": "🔥", "voter": WALLET_B})
check("SECURITY: cannot react cross-room", st == 404, f"st={st} body={rx}")

print("=== 4. LEADERBOARD ===")
st, allb = call("GET", "/api/community?window=all")
tr = allb.get("topRooms", [])
tv = allb.get("topVoices", [])
mine = next((r for r in tr if r["marketId"] == mid), None)
check("audit room on Top Rooms board", mine is not None, json.dumps([r["marketId"] for r in tr][:5]))
check("audit room commentCount == 6", mine and mine["commentCount"] == 6, f"count={mine and mine['commentCount']}")
counts = [r["commentCount"] for r in tr]
check("Top Rooms sorted desc", counts == sorted(counts, reverse=True), str(counts))
voices_a = next((v for v in tv if v["wallet"] == WALLET_A), None)
# WALLET_A posts 4 comments in this suite: probe "hi", "YES…", impersonation probe, room-B comment
check("wallet A on Top Voices with 4 comments", voices_a and voices_a["commentCount"] == 4,
      json.dumps(tv[:5]))
st, week = call("GET", "/api/community?window=week")
check("week window returns board", st == 200 and isinstance(week.get("topRooms"), list))
st, totals = call("GET", "/api/community")
check("totals rooms/comments present", totals.get("totals", {}).get("rooms", 0) >= 1 and totals.get("totals", {}).get("comments", 0) >= 5, json.dumps(totals.get("totals", {})))

print("=== 5. ROOM DETAIL BUNDLE ===")
st, bundle = call("GET", f"/api/rooms/{mid}")
check("room bundle 200 + demo flag", st == 200 and bundle.get("demo") is True and bundle.get("room"), f"st={st}")
check("bundle commentCount == 6", bundle.get("room", {}).get("commentCount") == 6)

print()
print(f"RESULT: {len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    print("FAILED:")
    for f in FAIL:
        print(" -", f)
    sys.exit(1)
