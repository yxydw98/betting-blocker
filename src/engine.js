/*
 * Betting Blocker — content engine.
 *
 * Runs on every page at document_start. Two confidence tiers, mirroring the
 * false-positive audit that produced the lists:
 *
 *   CONSERVATIVE (every site, default):
 *     - structural site-pack selectors (instant CSS, e.g. HLTV) — high confidence
 *     - hide links / iframes / images whose URL resolves to a bookmaker domain
 *       or a betting path. Only the element itself is hidden, never an ancestor
 *       row / article. Network-level domain blocking is handled separately by
 *       declarativeNetRequest.
 *
 *   AGGRESSIVE (only hosts in config.aggressiveHosts; HLTV preloaded):
 *     - everything above, PLUS text / attribute / brand scanning, heavily
 *       guarded: never touches protected zones (articles, forum/news bodies,
 *       stats tables, headings, paragraphs), only hides small "widget"-sized
 *       containers, and brand/keyword hits must be corroborated.
 *
 * The lexicon (domains, brands, keyword scopes) is fetched from data/lists.json
 * so there is a single source of truth shared with the network rules.
 */
(() => {
  "use strict";

  const PACKS = globalThis.BETBLOCK_PACKS || { defaults: {}, sites: [] };
  const DEFAULTS = PACKS.defaults || {};
  const ADS = globalThis.BETBLOCK_ADS || { cosmetic: [] };
  const HOST = location.hostname.replace(/^www\./, "");

  // Don't run on the extension's own pages.
  if (location.protocol === "chrome-extension:") return;

  const pack = (PACKS.sites || []).find((p) =>
    (p.match || []).some((suf) => HOST === suf || HOST.endsWith("." + suf))
  );

  // ---- instant structural hide (sync, before paint) ----------------------
  const styleEls = []; // { el, tag }
  function injectCss(selectors, tag, decl) {
    if (!selectors || !selectors.length) return;
    const el = document.createElement("style");
    el.setAttribute("data-betblock", tag || "core");
    el.textContent =
      selectors.join(",\n") + "{" + (decl || "display:none !important;") + "}";
    (document.head || document.documentElement).appendChild(el);
    styleEls.push({ el, tag: tag || "core" });
  }
  function removeTag(tag) {
    for (const s of styleEls) if (s.tag === tag) s.el.remove();
  }
  // Apply selectors immediately, assuming the relevant toggles are on; init()
  // tears down whichever layer turns out to be off (extension disabled, or
  // ad-blocking off). "bet" = betting layer, "ads" = general ad layer.
  if (pack) injectCss(pack.core, "bet");
  if (pack) injectCss(pack.adCore, "ads");
  if (pack) injectCss(pack.bgKill, "ads", "background-image:none !important;");
  injectCss(ADS.cosmetic, "ads"); // generic ad cosmetics, every site

  // Runtime sweep for background/skin takeover ads: the ad script can set the
  // creative via an inline style (possibly !important), which a stylesheet
  // can't override — so clear it directly off the skin elements.
  let adsOn = true; // assume on until config says otherwise
  function clearSkin() {
    if (!adsOn || !pack || !pack.bgKill) return;
    let els;
    try {
      els = document.querySelectorAll(pack.bgKill.join(","));
    } catch {
      return;
    }
    for (const el of els) {
      const bg = el.style && el.style.backgroundImage;
      if (bg && bg !== "none") el.style.setProperty("background-image", "none", "important");
    }
  }

  // ---- runtime state (filled by init) ------------------------------------
  let CFG = Object.assign({}, DEFAULTS);
  let DOMAINS = [];
  let PATH_SIGNALS = [];
  let TEXT_KW = [];
  let BRANDS = [];
  let aggressive = false;
  let hidden = 0;

  // ---- helpers -----------------------------------------------------------
  const PROTECTED =
    'article,[role="article"],main,[role="main"],table,thead,tbody,tr,td,th,' +
    "p,h1,h2,h3,h4,h5,h6,blockquote,.article,.news,.newstext,.post,.comment";

  const CLASS_HINT =
    '[class*="bet" i],[class*="odds" i],[class*="wager" i],[class*="gambl" i],' +
    '[class*="bonus" i],[class*="casino" i],[class*="sportsbook" i],' +
    '[class*="bookmaker" i],[id*="bet" i],[id*="odds" i],[id*="casino" i]';

  const ATTR_RE = /\b(betting|bookmaker|sportsbook|gambling|apostas|sportwetten|betslip)\b/i;
  const WORD_RE = /\b(betting|bookmaker|sportsbook|gambling|odds)\b/;

  function cls(el) {
    const c = el && el.getAttribute && el.getAttribute("class");
    return ((c || "") + " " + ((el && el.id) || "")).toLowerCase();
  }
  function isProtected(el) {
    return !!(el && el.matches && el.matches(PROTECTED));
  }
  function inProtected(el) {
    return !!(el && el.closest && el.closest(PROTECTED));
  }
  function hide(el) {
    if (!el || el.nodeType !== 1 || el.__bb) return;
    el.__bb = 1;
    el.style.setProperty("display", "none", "important");
    el.setAttribute("data-betblock", "hidden");
    hidden++;
  }

  function hostBlocked(h) {
    if (!h) return false;
    h = h.toLowerCase();
    for (const d of DOMAINS) if (h === d || h.endsWith("." + d)) return true;
    return false;
  }
  function urlIsBetting(raw) {
    if (!raw) return false;
    let u;
    try {
      u = new URL(raw, location.href);
    } catch {
      return false;
    }
    if (hostBlocked(u.hostname)) return true;
    const path = (u.pathname || "").toLowerCase();
    for (const sig of PATH_SIGNALS) if (path === sig || path.startsWith(sig)) return true;
    return false;
  }

  // ---- conservative: betting links / resources ---------------------------
  const LINKABLE = "a[href],area[href],iframe[src],img[src]";
  function scanLinks(root) {
    let els;
    try {
      els = root.querySelectorAll ? root.querySelectorAll(LINKABLE) : [];
    } catch {
      els = [];
    }
    for (const el of els) {
      const url = el.getAttribute("href") || el.getAttribute("src");
      if (urlIsBetting(url)) hide(el); // element only, never an ancestor
    }
    if (root.nodeType === 1 && root.matches && root.matches(LINKABLE)) {
      const url = root.getAttribute("href") || root.getAttribute("src");
      if (urlIsBetting(url)) hide(root);
    }
  }

  // ---- aggressive: attribute scan ----------------------------------------
  function attrScan(root) {
    let els;
    try {
      els = root.querySelectorAll("[title],[alt],[aria-label]");
    } catch {
      return;
    }
    for (const el of els) {
      if (el.__bb || inProtected(el)) continue;
      const a =
        (el.getAttribute("title") || "") +
        " " +
        (el.getAttribute("alt") || "") +
        " " +
        (el.getAttribute("aria-label") || "");
      if (ATTR_RE.test(a)) hide(el);
    }
  }

  // ---- aggressive: betting-ish containers (by class/id hint) --------------
  function confirmBetting(el) {
    let link;
    try {
      link = el.querySelector(LINKABLE);
    } catch {
      link = null;
    }
    if (link) {
      const u = link.getAttribute("href") || link.getAttribute("src");
      if (urlIsBetting(u)) return true;
    }
    const txt = (el.textContent || "").toLowerCase();
    if (txt && txt.length < 600) {
      if (TEXT_KW.some((k) => txt.includes(k))) return true;
      if (WORD_RE.test(txt)) return true;
      if (BRANDS.some((b) => txt.includes(b))) return true;
    }
    return false;
  }
  function classHintScan(root) {
    let cands;
    try {
      cands = root.querySelectorAll(CLASS_HINT);
    } catch {
      return;
    }
    const check = (el) => {
      if (!el || el.__bb || isProtected(el) || inProtected(el)) return;
      if ((el.textContent || "").length > 800) return; // don't nuke big layout blocks
      if (confirmBetting(el)) hide(el);
    };
    for (const el of cands) check(el);
    if (root.nodeType === 1 && root.matches && root.matches(CLASS_HINT)) check(root);
  }

  // ---- aggressive: strong text phrases anywhere --------------------------
  function leafWidget(el) {
    let n = el,
      best = el,
      depth = 0;
    while (n && n.nodeType === 1 && depth < 5) {
      if (isProtected(n)) break;
      if ((n.textContent || "").length > 240) break;
      best = n;
      n = n.parentElement;
      depth++;
    }
    return best;
  }
  function textPhraseScan(root) {
    if (!TEXT_KW.length) return;
    let walker;
    try {
      walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    } catch {
      return;
    }
    const hits = [];
    let tn;
    while ((tn = walker.nextNode())) {
      const t = tn.nodeValue;
      if (!t || t.length > 300) continue;
      const low = t.toLowerCase();
      if (TEXT_KW.some((k) => low.includes(k))) hits.push(tn);
    }
    for (const tn of hits) {
      const el = tn.parentElement;
      if (!el || el.__bb || inProtected(el)) continue;
      const w = leafWidget(el);
      if (w && !inProtected(w)) hide(w);
    }
  }

  // ---- dispatch ----------------------------------------------------------
  function processRoot(root) {
    if (!root || root.nodeType !== 1) return;
    scanLinks(root);
    if (aggressive) {
      attrScan(root);
      classHintScan(root);
      textPhraseScan(root);
    }
  }

  // batch mutations
  let pending = [];
  let scheduled = false;
  const idle =
    window.requestIdleCallback ||
    ((cb) => window.requestAnimationFrame(() => cb()));
  function flush() {
    scheduled = false;
    const nodes = pending;
    pending = [];
    for (const n of nodes) if (n && n.nodeType === 1 && document.contains(n)) processRoot(n);
    clearSkin();
    if (CFG.debug && hidden) console.debug("[betting-blocker] hidden:", hidden);
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    idle(flush, { timeout: 500 });
  }
  const observer = new MutationObserver((muts) => {
    for (const m of muts)
      for (const n of m.addedNodes) if (n.nodeType === 1) pending.push(n);
    if (pending.length) schedule();
  });

  // SPA navigations
  function hookHistory() {
    const full = () => processRoot(document.documentElement);
    const wrap = (name) => {
      const orig = history[name];
      if (typeof orig !== "function") return;
      history[name] = function () {
        const r = orig.apply(this, arguments);
        setTimeout(full, 300);
        return r;
      };
    };
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", () => setTimeout(full, 300));
  }

  // ---- config / lists ----------------------------------------------------
  function getConfig() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(null, (v) => resolve(v || {}));
      } catch {
        resolve({});
      }
    });
  }
  async function loadLists() {
    try {
      const res = await fetch(chrome.runtime.getURL("data/lists.json"));
      return await res.json();
    } catch {
      return { domains: [], pathSignals: [], textKeywords: [], brands: [] };
    }
  }

  async function init() {
    const cfg = await getConfig();
    CFG = Object.assign({}, DEFAULTS, cfg);

    if (CFG.enabled === false) {
      for (const s of styleEls) s.el.remove();
      return;
    }
    // Ad-blocking off -> drop the instantly-injected ad CSS (betting stays).
    adsOn = CFG.blockAds !== false;
    if (!adsOn) removeTag("ads");

    aggressive =
      CFG.aggressiveAllSites === true ||
      (CFG.aggressiveHosts || []).some(
        (suf) => HOST === suf || HOST.endsWith("." + suf)
      );

    const lists = await loadLists();
    DOMAINS = (lists.domains || []).concat(
      (CFG.extraDomains || []).map((d) => String(d).toLowerCase().trim())
    );
    PATH_SIGNALS = lists.pathSignals || [];
    TEXT_KW = (lists.textKeywords || []).concat(
      (CFG.extraTextKeywords || []).map((s) => String(s).toLowerCase().trim())
    );
    BRANDS = (lists.brands || []).map((b) => String(b).toLowerCase());

    // optional pack selectors (config-gated)
    if (pack && pack.optional) {
      const extra = [];
      if (CFG.hideVote && pack.optional.vote) extra.push(...pack.optional.vote);
      if (CFG.hideForumLink && pack.optional.forumLink)
        extra.push(...pack.optional.forumLink);
      if (extra.length) injectCss(extra, "optional");
    }

    observer.observe(document.documentElement, { childList: true, subtree: true });
    const full = () => {
      processRoot(document.documentElement);
      clearSkin();
    };
    full();
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", full, { once: true });
    window.addEventListener("load", () => setTimeout(full, 300), { once: true });
    hookHistory();
    // Settings changes apply on the next page load (the options UI tells the
    // user to reload) — we deliberately don't auto-reload open tabs, which
    // would discard unsaved form data elsewhere.
  }

  init();
})();
