# Betting Blocker

A Chrome extension (Manifest V3) that actively blocks betting & gambling
content — **on every website**, not just one. Built generic-engine + site-packs:
the same engine runs everywhere, and per-site packs add precise rules where
generic heuristics aren't enough. **HLTV** ships as the first aggressive pack.

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
| Block visiting betting sites | on | Redirect navigations to gambling domains to `blocked.html`. |
| Aggressive sites | `hltv.org` | Hosts that get full text/brand scrubbing. Add the current site from the popup. |
| Hide betting forum link | on | HLTV `/forums/betting`. |
| Hide "Pick a winner" vote | off | HLTV's free community vote (not real-money). |
| Extra domains | — | Your own domains to block network-wide. |
| Extra keyword phrases | — | Extra text to scrub on aggressive sites. |

## Making it apply to more sites

The cross-site blocking already works out of the box (domains + links +
conservative heuristics). To make a site **aggressive**, add its host on the
options page (or the popup toggle). To add **precise** structural rules for a
new site, add a pack to [`data/packs.js`](data/packs.js) — copy the HLTV entry,
swap the host suffix and the verified selectors. Nothing else changes.

## Regenerating the blocklists

The lexicon and rules derive from a single source, `data/lists.json`:

```sh
python tools/build_lists.py data/recon_raw.json   # curate lists.json from recon
python tools/build_rules.py                        # emit rules/embedded.json + navigation.json
```

`data/recon_raw.json` is the raw catalog (bookmaker domains, brand/keyword
lexicon, DOM hooks, and the false-positive audit) the lists were built from.

## Layout

```
manifest.json            MV3 manifest
background.js            toggles the navigation ruleset + user dynamic rules
data/
  packs.js              per-site structural selectors + default config
  lists.json            domains / brands / keyword lexicon (single source of truth)
  recon_raw.json        provenance: the raw recon catalog
src/engine.js           the cross-site content scanner
rules/
  embedded.json         DNR: block bookmaker sub-resources (all sites)
  navigation.json       DNR: redirect bookmaker navigations to blocked.html
options/                popup + full options page (shared ui.js)
blocked.html / .js      shown when a betting navigation is blocked
tools/                  build_lists.py, build_rules.py
```

## Limitations

- Heuristic by nature: a brand-new bookmaker domain won't be blocked at the
  network layer until added (use **Extra domains**). Aggressive text scanning
  can occasionally miss or over-hide — report a site and it can be tuned with a
  pack.
- No icons are bundled (Chrome shows a default). Drop PNGs in and reference them
  from the manifest if you want a custom one.
