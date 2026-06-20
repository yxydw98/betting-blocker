/*
 * Site packs + default config.
 *
 * A "pack" is a set of high-confidence STRUCTURAL selectors for one site,
 * verified against that site's real markup. They are hidden instantly at
 * document_start (no flash). This is the per-site layer; the generic engine
 * (src/engine.js) runs everywhere and needs no pack.
 *
 * `core`     -> hidden whenever the extension is enabled on the site.
 * `optional` -> hidden only when the matching config toggle is on.
 *
 * To support a new site, add an object to `sites` with its host suffix(es)
 * and verified selectors. Nothing else needs to change.
 */
globalThis.BETBLOCK_PACKS = {
  defaults: {
    enabled: true,
    blockAds: true,                  // block ALL ads/trackers (not just betting)
    blockNavigation: true,           // redirect navigations to bookmaker sites
    aggressiveAllSites: false,       // BETA: full text/brand scrubbing on EVERY site
    aggressiveHosts: ["hltv.org"],   // full text/brand scrubbing on these hosts
    hideVote: false,                 // keep HLTV's free community "Pick a winner" vote
    hideForumLink: true,             // hide the /forums/betting nav link
    extraDomains: [],                // user-added domains to block (network-level)
    extraTextKeywords: [],           // user-added phrases for aggressive text scan
    debug: false,
  },

  sites: [
    {
      // Verified against hltv.org home / matches / results / events / match page.
      match: ["hltv.org"],
      core: [
        // Top-nav "Betting" dropdown (the <ul> id is randomized per load).
        'ul.nav-item:has(> a.nav-link[href^="/betting"])',
        // Match-page betting block.
        '.betting-section',
        '#betting',
        // "Analytics center / Find insights for your bet" card + its CTA.
        '.matchpage-analytics-section',
        'a.matchpage-analytics-center-container[href^="/betting/analytics"]',
        // Per-fixture "Odds & prediction" button in match listings (anchor only).
        'a.match-btn.match-analytics-btn[href^="/betting/analytics"]',
        // /betting hub: Better Collective bookmaker comparison + bonus blocks.
        '.category-operator-loop-wrapper',
        '.bc-blocks-gutenberg.operator-loop-block.operator-loop',
        '[class^="bonus-code-block--"]',
        '[class*=" bonus-code-block--"]',
        // Affiliate outbound links + bookmaker creatives.
        'a[href^="https://bcwp.hltv.org"]',
        'img[src*="assets-bcwp.hltv.org"]',
      ],
      // General display/banner ads (hidden only when `blockAds` is on).
      // Verified against hltv.org home / results / match pages.
      adCore: [
        // Every htlbid/Aditude impression-tracked ad slot is marked by this attr.
        '[data-imp-trk]',
        // Rendered banner creatives go through HLTV's /out2/ ad redirector.
        'a[href^="/out2/"]',
        // Aditude (htlbid framework) placement containers.
        '.aditude-placement',
        '[data-aditude-base-div-id]',
        '[id^="aditude-placement-"]',
        '[data-id-prefix^="aditude-placement-"]',
        // Live GPT ad divs injected by htlbid.js.
        'div[class*="htlad-"]',
        'div[id*="htlad-"]',
        // Match-page banner after the betting block.
        '.matchpage-after-betting-desktop-mobile-new',
        // Top mobile banner + centered placement wrappers.
        '.mobiletop.centered-placement',
        '.mobiletop.smartphone-only',
        '.centered-placement-bottom-spacing',
        '.centered-placement',
        // Background "skin"/wallpaper takeover ad.
        '.bgPadding .bg-enabler[data-imp-trk]',
        '.bg-enabler-child.left',
        '.bg-enabler-child.right',
        // Sticky left/right sidebar ad rails.
        '.bg-sidebar.left .secondary-sidebar-container',
        '.bg-sidebar.right .secondary-sidebar-container',
        // Lazy 1x1 placeholder ad slots expanded at runtime.
        'div[style*="height: 1px"][style*="width: 1px"][data-imp-trk]',
      ],
      // Background / "skin" / wallpaper takeover ads (e.g. Hellcase). The
      // creative is painted as a CSS background-image, so display:none on the
      // wrong element won't remove it — these get `background-image:none` and
      // an inline-style sweep instead. High-specificity selectors (html body)
      // beat a later !important rule the ad script injects.
      bgKill: [
        'html',
        'html body',
        'html .bgPadding',
        '.bg-enabler',
        '.bg-enabler-child',
        '.bg-enabler-child.left',
        '.bg-enabler-child.right',
        '.bg-sidebar',
        '.bg-sidebar.left',
        '.bg-sidebar.right',
      ],
      optional: {
        // Community win-probability vote: betting-ADJACENT but free / non-money.
        vote: ['.pick-a-winner-wrapper'],
        // Betting discussion forum link (community content, not a sportsbook CTA).
        forumLink: ['a.dropdown-link[href="/forums/betting"]'],
      },
    },
  ],
};
