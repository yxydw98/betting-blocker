"""Build data/lists.json from the recon dataset.

Single source of truth for the blocklists. Reads the raw recon JSON (the
multi-agent catalog of bookmaker domains, brand/keyword lexicon, and the
false-positive audit), curates it (drops the site's own domain + malformed
entries, adds the affiliate hosts found in the DOM scan), and writes a clean
lists.json the extension fetches at runtime and the rule builder consumes.

Usage:
    python tools/build_lists.py [path-to-recon-output.json]

If no path is given it expects data/recon_raw.json to already exist.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / "data"

# Hosts that are the site's own / not gambling -> never put in the blocklist.
DROP_DOMAINS = {
    "hltv.org",            # the site we run on; blocking it kills everything
    "googletagmanager.com",
    "googletagservices.com",
    "csgoempire.gg.com",   # malformed double-TLD entry from recon
}

# Betting-affiliate hosts found in the DOM scan (subdomains of hltv.org, so
# blocking them does NOT block hltv.org itself) plus the affiliate tracker.
ADD_AFFILIATE_HOSTS = [
    "bcwp.hltv.org",
    "assets-bcwp.hltv.org",
    "cadmus.script.ac",
]

# URL path fragments that reliably signal a betting destination regardless of
# host. Curated (not from recon): '/casino' deliberately excluded to avoid
# hotel/resort false positives -- casino *domains* are still blocked.
PATH_SIGNALS = [
    "/betting",
    "/apostas",
    "/sportsbook",
    "/sportwetten",
    "/bookmaker",
]


def norm_domain(d: str) -> str:
    d = d.strip().lower()
    for pre in ("http://", "https://"):
        if d.startswith(pre):
            d = d[len(pre):]
    return d.strip("/")


def dedup_ci(items):
    """Dedup case-insensitively, preserving first-seen original casing."""
    seen = set()
    out = []
    for it in items:
        k = it.strip().lower()
        if k and k not in seen:
            seen.add(k)
            out.append(it.strip())
    return out


def main() -> int:
    raw_path = Path(sys.argv[1]) if len(sys.argv) > 1 else (DATA / "recon_raw.json")
    blob = json.loads(raw_path.read_text(encoding="utf-8"))
    result = blob.get("result", blob)  # accept either the wrapped task output or the bare result

    # Persist provenance copy if we read from an external path.
    DATA.mkdir(parents=True, exist_ok=True)
    prov = DATA / "recon_raw.json"
    if raw_path.resolve() != prov.resolve():
        prov.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    # --- domains -----------------------------------------------------------
    raw_domains = [norm_domain(d) for d in result["domains"]["domains"]]
    raw_domains += [norm_domain(d) for d in ADD_AFFILIATE_HOSTS]
    domains = sorted({d for d in raw_domains if d and d not in DROP_DOMAINS})

    # --- brands ------------------------------------------------------------
    brands = dedup_ci(result["lexicon"]["brands"])

    # --- keywords (from the false-positive audit) --------------------------
    text_keywords = dedup_ci([k.lower() for k in result["audit"]["safeKeywordsTextScope"]])
    link_keywords = dedup_ci([k.lower() for k in result["audit"]["linkOnlyKeywords"]])

    lists = {
        "_meta": {
            "source": "multi-agent recon (DOM hooks + lexicon + domains + false-positive audit)",
            "domains": len(domains),
            "brands": len(brands),
            "note": "Regenerate with tools/build_lists.py; then tools/build_rules.py.",
        },
        "domains": domains,
        "pathSignals": PATH_SIGNALS,
        "brands": brands,
        "textKeywords": text_keywords,
        "linkKeywords": link_keywords,
    }

    out = DATA / "lists.json"
    out.write_text(json.dumps(lists, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out}  ({len(domains)} domains, {len(brands)} brands, "
          f"{len(text_keywords)} text kw, {len(link_keywords)} link kw)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
