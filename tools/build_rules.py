"""Generate the declarativeNetRequest rule files.

Betting rulesets (from data/lists.json):
  - rules/embedded.json   : block bookmaker sub-resources (iframes/scripts/
                            images/xhr) on ANY site -> kills embedded betting
                            widgets and ads everywhere. Always enabled.
  - rules/navigation.json : redirect top-level navigations to a bookmaker
                            domain to the bundled blocked.html. Toggleable.

Ad ruleset (from data/ad_domains.json, if present):
  - rules/ads.json        : block ad/tracker sub-resources on ANY site.
                            Toggleable via the blockAds setting.

Run after build_lists.py / build_ad_lists.py:
    python tools/build_rules.py
"""
from __future__ import annotations

import json
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
RULES = BASE / "rules"

# Everything except main_frame -> embedded resources only.
SUBRESOURCE_TYPES = [
    "sub_frame", "script", "image", "stylesheet", "font",
    "object", "xmlhttprequest", "ping", "media", "websocket", "other",
]


def main() -> int:
    lists = json.loads((BASE / "data" / "lists.json").read_text(encoding="utf-8"))
    domains = lists["domains"]
    RULES.mkdir(parents=True, exist_ok=True)

    embedded = [{
        "id": 1,
        "priority": 1,
        "action": {"type": "block"},
        "condition": {
            "requestDomains": domains,
            "resourceTypes": SUBRESOURCE_TYPES,
        },
    }]
    (RULES / "embedded.json").write_text(
        json.dumps(embedded, indent=2), encoding="utf-8")

    navigation = [{
        "id": 1,
        "priority": 1,
        "action": {
            "type": "redirect",
            "redirect": {"extensionPath": "/blocked.html"},
        },
        "condition": {
            "requestDomains": domains,
            "resourceTypes": ["main_frame"],
        },
    }]
    (RULES / "navigation.json").write_text(
        json.dumps(navigation, indent=2), encoding="utf-8")

    print(f"wrote rules/embedded.json + rules/navigation.json "
          f"({len(domains)} domains each)")

    # --- ad ruleset (optional) ---------------------------------------------
    ad_path = BASE / "data" / "ad_domains.json"
    if ad_path.exists():
        ad_domains = json.loads(ad_path.read_text(encoding="utf-8"))["domains"]
        ads = [{
            "id": 1,
            "priority": 1,
            "action": {"type": "block"},
            "condition": {
                "requestDomains": ad_domains,
                "resourceTypes": SUBRESOURCE_TYPES,
            },
        }]
        (RULES / "ads.json").write_text(json.dumps(ads, indent=2), encoding="utf-8")
        print(f"wrote rules/ads.json ({len(ad_domains)} domains)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
