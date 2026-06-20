# Betting Blocker

A Chrome extension (Manifest V3) that actively blocks betting & gambling
content — **and, optionally, all ads & trackers** — on **every website**, not
just one. Built generic-engine + site-packs: the same engine runs everywhere,
and per-site packs add precise rules where generic heuristics aren't enough.
**HLTV** ships as the first aggressive pack.

## What it blocks

Two confidence tiers, tuned by a false-positive audit so it doesn't nuke
legitimate content (news articles about betting, stats tables, sponsor-named
events like "Stake Ranked", etc.):

**Conservative — every site, always on**
- **Network layer** (`declarativeNetRequest`): blocks ~295 bookmaker / gambling /
  skin-gambling domains. Embedded betting widgets, iframes, and ad scripts are
  blocked no matter which site embeds them. Optionally (default on) navigating
  *to* a betting site is redirected to a "blocked" page.
- **Link layer**: hides links / iframes / images that resolve to a betting
  domain or betting URL path. Only the element itself is hidden — never the
  surrounding article or match row.
- **Site packs**: high-confidence structural selectors verified against a
  specific site's markup (HLTV's betting nav, match-page odds block, /betting
  bonus tables…), hidden instantly with no flash.

**Aggressive — only on hosts you opt into (HLTV preloaded)**
- Scans page text, attributes, and brand names and removes betting widgets the
  conservative pass would miss. Heavily guarded: it never touches articles,
  forum/news bodies, stats tables, or headings, and only hides small
  widget-sized containers.

**Ad blocking — separate `blockAds` toggle, default on, every site**
- **Network layer**: blocks ~407 ad/tracker/ad-tech domains (Google ad stack,
  SSPs/DSPs, Taboola/Outbrain, analytics, pop networks, mobile ad SDKs…).
- **Cosmetic layer**: hides ad slots via 52 audited, high-confidence selectors
  (`ins.adsbygoogle`, GPT `div-gpt-ad-*`, ad-network iframes, `amp-ad`…). Naive
  `[class*="ad"]` matching is deliberately excluded so layouts don't break.
- **HLTV ad pack**: the header-bidding banners, `/out2/` creatives, skin/
  wallpaper takeover, and sidebar/impression slots.
- A false-positive audit dropped dual-use hosts (`connect.facebook.net`,
  `t.co`, `app.link`, Branch/Snap/Teads runtimes) and over-broad selectors so it
  doesn't break logins, video, or real content. It's a *curated* list, not full
  EasyList — a few ads may slip through; add domains in **Extra domains**.

## Install (load unpacked)

1. Open `chrome://extensions`.
2. Toggle **Developer mode** (top-right).
3. **Load unpacked** → select this folder.
4. The 🚫 icon appears in the toolbar. Click it for quick toggles, or
   **All settings…** for the full options page.

Works in any Chromium browser (Chrome, Edge, Brave, Opera).

## Settings

| Setting | Default | Effect |
|---|---|---|
| Extension enabled | on | Master switch. |
| Block all ads & trackers | on | General ad blocking (network + cosmetic) on every site, independent of betting. |
| Block visiting betting sites | on | Redirect navigations to gambling domains to `blocked.html`. |
| Aggressive sites | `hltv.org` | Hosts that get full text/brand scrubbing. Add the current site from the popup. |
| Hide betting forum link | on | HLTV `/forums/betting`. |
| Hide "Pick a winner" vote | off | HLTV's free community vote (not real-money). |
| Extra domains | — | Your own domains to block network-wide. |
| Extra keyword phrases | — | Extra text to scrub on aggressive sites. |
| Language | Auto | UI language: Auto (follow browser) / English / 中文. |

The UI (popup, options, blocked page) is localized via a self-managed i18n
layer ([`i18n.js`](i18n.js)) — independent of the browser locale. Add a language
by extending the `BB_I18N` dictionary and the options `<select>`.

## Making it apply to more sites

The cross-site blocking already works out of the box (domains + links +
conservative heuristics). To make a site **aggressive**, add its host on the
options page (or the popup toggle). To add **precise** structural rules for a
new site, add a pack to [`data/packs.js`](data/packs.js) — copy the HLTV entry,
swap the host suffix and the verified selectors. Nothing else changes.

## Regenerating the blocklists

The lists derive from raw recon catalogs via the build scripts:

```sh
# Betting layer (from data/recon_raw.json)
python tools/build_lists.py data/recon_raw.json      # -> data/lists.json
# Ad layer (from data/ad_recon_raw.json)
python tools/build_ad_lists.py data/ad_recon_raw.json # -> data/ad_domains.json + data/ad_selectors.js
# DNR rules from both
python tools/build_rules.py                           # -> rules/embedded.json, navigation.json, ads.json
```

`data/recon_raw.json` and `data/ad_recon_raw.json` are the raw catalogs
(domains, lexicon/selectors, DOM hooks, and false-positive audits) the lists
were built from.

## Layout

```
manifest.json            MV3 manifest
background.js            toggles the navigation ruleset + user dynamic rules
data/
  packs.js              per-site structural selectors (betting + ads) + defaults
  lists.json            betting domains / brands / keyword lexicon
  ad_domains.json       ad/tracker domains for the DNR ads ruleset
  ad_selectors.js       generic cosmetic ad selectors (generated)
  recon_raw.json        provenance: raw betting recon catalog
  ad_recon_raw.json     provenance: raw ad recon catalog
src/engine.js           the cross-site content scanner
rules/
  embedded.json         DNR: block bookmaker sub-resources (all sites)
  navigation.json       DNR: redirect bookmaker navigations to blocked.html
  ads.json              DNR: block ad/tracker sub-resources (all sites)
options/                popup + full options page (shared ui.js)
blocked.html / .js      shown when a betting navigation is blocked
tools/                  build_lists.py, build_ad_lists.py, build_rules.py
```

## Limitations

- Heuristic by nature: a brand-new bookmaker domain won't be blocked at the
  network layer until added (use **Extra domains**). Aggressive text scanning
  can occasionally miss or over-hide — report a site and it can be tuned with a
  pack.
- No icons are bundled (Chrome shows a default). Drop PNGs in and reference them
  from the manifest if you want a custom one.
