#!/usr/bin/env python3
"""Fetch all Panta API docs .md pages listed in llms.txt for offline analysis."""
import os
import re
import urllib.request

BASE = "https://docs.panta.market"
OUT = "/home/z/my-project/scripts/panta-docs"
os.makedirs(OUT, exist_ok=True)

HDRS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}

def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=HDRS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")

llms = fetch(f"{BASE}/llms.txt")

urls = re.findall(r"https://docs\.panta\.market(/[^\s):]+\.md)", llms)
print(f"Found {len(urls)} doc pages")

for path in urls:
    name = path.strip("/").replace("/", "__")
    dest = os.path.join(OUT, name)
    try:
        body = fetch(f"{BASE}{path}")
        with open(dest, "w") as f:
            f.write(body)
        print(f"OK  {path} ({len(body)} bytes)")
    except Exception as e:
        print(f"ERR {path}: {e}")
