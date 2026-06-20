# Betting Blocker

A Chrome extension (Manifest V3) that blocks **betting & gambling** content —
bookmaker sites, betting links/widgets, and HLTV's native betting column. It is
**betting-only by design**: pair it with an ad blocker for ads.

## The setup: two tools, one job each

| Job | Tool |
|---|---|
| **Ads & trackers** | [uBlock Origin](https://ublockorigin.com/) or **uBO Lite** — their maintained lists (EasyList/EasyPrivacy) are the best at this. |
| **Betting / gambling** | **This extension** — gambling-domain blocking + HLTV's betting column. |

Why split it? On MV3 Chrome, uBO Lite is great at network ad-blocking but can't
cleanly take custom **cosmetic** filters (it has no URL subscription and gates
cosmetic rules behind per-site permission modes). Hiding HLTV's betting column
is exactly the cosmetic work this extension does natively — so let uBOL do ads
and let this do betting. The two don't overlap.

## Install (load unpacked)

1. Open `chrome://extensions`, enable **Developer mode** (top-right).
2. **Load unpacked** → select this folder.
3. The chip icon appears in the toolbar; click it for the popup, or **All
   settings…** for the options page (with an English / 中文 language switch).

Works in any Chromium browser. Keep uBlock Origin (or uBO Lite) installed
alongside for ads.

## What it blocks

Two confidence tiers, tuned by a false-positive audit so it doesn't nuke
legitimate content (news about betting, stats tables, sponsor-named events like
"Stake Ranked"):

**Conservative — every site, always on**
- **Network layer** (`declarativeNetRequest`): blocks 295 bookmaker / gambling /
  skin-gambling domains. Embedded betting widgets/iframes die wherever they're
  embedded; navigating to a betting site is redirected to a blocked page
  (toggleable).
- **Link layer**: hides links / iframes / images that resolve to a betting
  domain or path — the element only, never the surrounding article or match row.
- **HLTV pack**: high-confidence structural selectors verified against HLTV's
  markup (the betting nav, match-page odds block, /betting bonus tables, the
  per-fixture odds buttons), hidden instantly with no flash.

**Aggressive — only on hosts you opt into (HLTV preloaded)**
- Scans page text, attributes, and brand names to remove betting widgets the
  conservative pass misses. Guarded: never touches articles, forum/news bodies,
  stats tables, or headings; only hides small widget-sized containers.

## Settings

| Setting | Default | Effect |
|---|---|---|
| Extension enabled | on | Master switch. |
| Block visiting betting sites | on | Redirect navigations to gambling domains to `blocked.html`. |
| Aggressive on all sites (beta) | off | Full text/brand scrubbing on every site (may over-hide on sports/news). |
| Aggressive sites | `hltv.org` | Hosts that get aggressive scrubbing. Add the current site from the popup. |
| Hide betting forum link | on | HLTV `/forums/betting`. |
| Hide "Pick a winner" vote | off | HLTV's free community vote (not real-money). |
| Extra domains | — | Your own domains to block network-wide. |
| Extra keyword phrases | — | Extra text to scrub on aggressive sites. |
| Language | Auto | UI language: Auto (follow browser) / English / 中文. |

## Alternative: a uBlock Origin filter list (no second extension)

If you run **classic uBlock Origin** (not uBO Lite) and would rather not load a
second extension, [`filters/betting.txt`](filters/betting.txt) reproduces the
betting blocking as a uBO filter list (295 domain rules + 12 HLTV cosmetic
rules). Import it via uBO dashboard → **Filter lists → Import…**:

```
https://raw.githubusercontent.com/yxydw98/betting-blocker/main/filters/betting.txt
```

> This path needs *classic* uBO's cosmetic + subscription support. uBO **Lite**
> can't reliably apply the cosmetic rules — on uBO Lite, use the extension above.

## Layout

```
manifest.json            MV3 manifest
background.js            toggles the navigation ruleset + user dynamic rules
data/
  packs.js              per-site betting selectors + default config
  lists.json            betting domains / brands / keyword lexicon
  recon_raw.json        provenance: raw betting recon catalog
src/engine.js           the cross-site betting scanner
rules/
  embedded.json         DNR: block bookmaker sub-resources (all sites)
  navigation.json       DNR: redirect bookmaker navigations to blocked.html
filters/betting.txt     uBlock Origin filter-list equivalent (alternative)
options/                popup + full options page (shared ui.js)
i18n.js                 English / 中文 UI strings
blocked.html / .js      shown when a betting navigation is blocked
icons/                  logo.svg + rasterized PNGs
tools/                  build_lists.py, build_rules.py, build_ublock_filters.py, make_icons.cjs
```

## Regenerating the data

```sh
python tools/build_lists.py data/recon_raw.json   # -> data/lists.json
python tools/build_rules.py                        # -> rules/embedded.json, navigation.json
python tools/build_ublock_filters.py               # -> filters/betting.txt
```

## Icon

The logo lives in [`icons/logo.svg`](icons/logo.svg) (a poker chip struck by a
prohibition slash). Regenerate the PNGs with `npm i sharp && node tools/make_icons.cjs`.

## Limitations

- Heuristic by nature: a brand-new bookmaker domain won't be blocked until added
  (use **Extra domains**). Aggressive text scanning can occasionally miss or
  over-hide — report a site and it can be tuned with a pack.
- Ads are **out of scope** — run uBlock Origin / uBO Lite for those.
