"""Generate a uBlock Origin / Adblock-syntax filter list for the BETTING side.

Ads are handled by uBlock Origin's own lists (EasyList etc.) — this list only
adds what uBO doesn't: gambling/bookmaker domain blocking and HLTV's native
betting column/widgets. Import it into uBO (Filter lists -> Import, or paste
into "My filters").

Reads data/lists.json (the bookmaker-domain blocklist). The HLTV cosmetic
selectors mirror data/packs.js `core` (betting layer).

Usage:
    python tools/build_ublock_filters.py
"""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent

# HLTV betting-column cosmetic filters — mirror of packs.js betting `core`.
HLTV_COSMETIC = [
    'ul.nav-item:has(> a.nav-link[href^="/betting"])',
    '.betting-section',
    '#betting',
    '.matchpage-analytics-section',
    'a.matchpage-analytics-center-container[href^="/betting/analytics"]',
    'a.match-btn.match-analytics-btn[href^="/betting/analytics"]',
    '.category-operator-loop-wrapper',
    '.bc-blocks-gutenberg.operator-loop-block.operator-loop',
    '[class^="bonus-code-block--"]',
    'a[href^="https://bcwp.hltv.org"]',
    'img[src*="assets-bcwp.hltv.org"]',
    # optional: the betting forum link
    'a.dropdown-link[href="/forums/betting"]',
]


def main() -> int:
    lists = json.loads((BASE / "data" / "lists.json").read_text(encoding="utf-8"))
    domains = lists["domains"]

    out = []
    out.append("! Title: Betting Blocker — gambling filters")
    out.append("! Description: Blocks betting/gambling sites + HLTV's betting column. "
               "Use ALONGSIDE uBlock Origin's ad lists (this list does not block ads).")
    out.append("! Homepage: https://github.com/yxydw98/betting-blocker")
    out.append(f"! Version: {date.today().strftime('%Y%m%d')}")
    out.append("! Expires: 7 days")
    out.append(f"! Last modified: {date.today().isoformat()}")
    out.append("!")
    out.append(f"! ==== Gambling / bookmaker domains ({len(domains)}) — network block, all sites ====")
    for d in domains:
        out.append(f"||{d}^")
    out.append("!")
    out.append("! ==== HLTV native betting column / widgets — cosmetic ====")
    for sel in HLTV_COSMETIC:
        out.append(f"hltv.org##{sel}")
    out.append("")

    target = BASE / "filters" / "betting.txt"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("\n".join(out), encoding="utf-8")
    print(f"wrote {target}  ({len(domains)} domain rules, {len(HLTV_COSMETIC)} cosmetic rules)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
