/*
 * Service worker: keeps the network-blocking rules in sync with config.
 *
 *  - The two static rulesets (embedded / navigation) are declared in the
 *    manifest. "navigation" (redirect bookmaker navigations to blocked.html)
 *    is toggled here from the `blockNavigation` setting.
 *  - User-added domains (`extraDomains`) become dynamic rules mirroring the
 *    static behaviour: always block sub-resources, and redirect navigations
 *    when blockNavigation is on.
 */
const DNR = chrome.declarativeNetRequest;

const SUBRESOURCE_TYPES = [
  "sub_frame", "script", "image", "stylesheet", "font",
  "object", "xmlhttprequest", "ping", "media", "websocket", "other",
];

const EXTRA_BLOCK_ID = 1001;
const EXTRA_REDIRECT_ID = 1002;

function getCfg() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { blockNavigation: true, blockAds: true, extraDomains: [] },
      (v) => resolve(v)
    );
  });
}

async function setRuleset(id, on) {
  try {
    await DNR.updateEnabledRulesets(
      on
        ? { enableRulesetIds: [id], disableRulesetIds: [] }
        : { enableRulesetIds: [], disableRulesetIds: [id] }
    );
  } catch (e) {
    console.warn(`[betting-blocker] ruleset toggle (${id}) failed:`, e);
  }
}

async function syncDynamicRules(extraDomains, blockNavigation) {
  const domains = (extraDomains || [])
    .map((d) => String(d).toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean);

  const addRules = [];
  if (domains.length) {
    addRules.push({
      id: EXTRA_BLOCK_ID,
      priority: 1,
      action: { type: "block" },
      condition: { requestDomains: domains, resourceTypes: SUBRESOURCE_TYPES },
    });
    if (blockNavigation) {
      addRules.push({
        id: EXTRA_REDIRECT_ID,
        priority: 1,
        action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
        condition: { requestDomains: domains, resourceTypes: ["main_frame"] },
      });
    }
  }
  try {
    await DNR.updateDynamicRules({
      removeRuleIds: [EXTRA_BLOCK_ID, EXTRA_REDIRECT_ID],
      addRules,
    });
  } catch (e) {
    console.warn("[betting-blocker] dynamic rules failed:", e);
  }
}

async function syncAll() {
  const { blockNavigation, blockAds, extraDomains } = await getCfg();
  await setRuleset("navigation", blockNavigation);
  await setRuleset("ads", blockAds);
  await syncDynamicRules(extraDomains, blockNavigation);
}

chrome.runtime.onInstalled.addListener(async () => {
  // Seed defaults without clobbering existing settings.
  const cur = await new Promise((r) => chrome.storage.sync.get(null, r));
  const seed = {};
  if (cur.enabled === undefined) seed.enabled = true;
  if (cur.blockNavigation === undefined) seed.blockNavigation = true;
  if (cur.blockAds === undefined) seed.blockAds = true;
  if (cur.aggressiveHosts === undefined) seed.aggressiveHosts = ["hltv.org"];
  if (cur.hideForumLink === undefined) seed.hideForumLink = true;
  if (Object.keys(seed).length) await new Promise((r) => chrome.storage.sync.set(seed, r));
  await syncAll();
});

chrome.runtime.onStartup.addListener(syncAll);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.blockNavigation || changes.blockAds || changes.extraDomains) syncAll();
});
