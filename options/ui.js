/* Shared logic for both the popup and the full options page.
   Each control is wired only if it exists on the current page. */

const DEFAULTS = {
  enabled: true,
  blockAds: true,
  blockNavigation: true,
  aggressiveAllSites: false,
  hideVote: false,
  hideForumLink: true,
  debug: false,
  language: "auto",
  aggressiveHosts: ["hltv.org"],
  extraDomains: [],
  extraTextKeywords: [],
};

let currentLang = "en"; // resolved language for dynamic strings

const FIELDS = {
  enabled: "checkbox",
  blockAds: "checkbox",
  blockNavigation: "checkbox",
  aggressiveAllSites: "checkbox",
  hideVote: "checkbox",
  hideForumLink: "checkbox",
  debug: "checkbox",
  aggressiveHosts: "list",
  extraDomains: "list",
  extraTextKeywords: "list",
};

const $ = (id) => document.getElementById(id);
const parseList = (s) =>
  s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const hostMatched = (list, host) =>
  (list || []).some((s) => host === s || host.endsWith("." + s));

function status(msg) {
  const el = $("status");
  if (!el) return;
  el.textContent = msg;
  clearTimeout(status._t);
  status._t = setTimeout(() => (el.textContent = ""), 1500);
}

function applyLang(setting) {
  currentLang = bbResolveLang(setting);
  bbApply(currentLang);
  if ($("language")) $("language").value = setting || "auto";
}

function load() {
  chrome.storage.sync.get(DEFAULTS, (cfg) => {
    applyLang(cfg.language);
    for (const [k, type] of Object.entries(FIELDS)) {
      const el = $(k);
      if (!el) continue;
      if (type === "checkbox") el.checked = !!cfg[k];
      else el.value = (cfg[k] || []).join("\n");
    }
    renderSite(cfg);
  });
  showStats();
}

function save() {
  chrome.storage.sync.get(DEFAULTS, (cfg) => {
    const out = Object.assign({}, cfg);
    for (const [k, type] of Object.entries(FIELDS)) {
      const el = $(k);
      if (!el) continue;
      out[k] = type === "checkbox" ? el.checked : parseList(el.value);
    }
    chrome.storage.sync.set(out, () => status(bbT(currentLang, "status_saved")));
  });
}

function getActiveHost(cb) {
  if (!chrome.tabs) return cb(null);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    try {
      cb(new URL(tabs[0].url).hostname.replace(/^www\./, ""));
    } catch {
      cb(null);
    }
  });
}

function renderSite(cfg) {
  const box = $("siteBox");
  if (!box) return;
  getActiveHost((host) => {
    const btn = $("toggleSite");
    if (!host) {
      box.style.display = "none";
      return;
    }
    $("siteHost").textContent = host;
    const on = hostMatched(cfg.aggressiveHosts, host);
    btn.dataset.host = host;
    btn.textContent = bbT(currentLang, on ? "aggr_on" : "aggr_off");
    btn.classList.toggle("on", on);
  });
}

function toggleSite() {
  const host = $("toggleSite").dataset.host;
  if (!host) return;
  chrome.storage.sync.get(DEFAULTS, (cfg) => {
    let list = cfg.aggressiveHosts || [];
    list = hostMatched(list, host)
      ? list.filter((s) => !(host === s || host.endsWith("." + s)))
      : list.concat(host);
    chrome.storage.sync.set({ aggressiveHosts: list }, () => {
      renderSite(Object.assign({}, cfg, { aggressiveHosts: list }));
      status(bbT(currentLang, "status_updated"));
    });
  });
}

function showStats() {
  const el = $("stats");
  if (!el) return;
  Promise.all([
    fetch(chrome.runtime.getURL("data/lists.json")).then((r) => r.json()),
    fetch(chrome.runtime.getURL("data/ad_domains.json")).then((r) => r.json()),
  ])
    .then(([l, a]) => {
      el.textContent = bbT(currentLang, "stats_tpl")
        .replace("{g}", l.domains.length)
        .replace("{b}", l.brands.length)
        .replace("{p}", l.textKeywords.length)
        .replace("{a}", a.domains.length);
    })
    .catch(() => {});
}

window.addEventListener("DOMContentLoaded", () => {
  load();
  // checkboxes auto-save on change; textareas via the Save button
  for (const [k, type] of Object.entries(FIELDS)) {
    if (type !== "checkbox") continue;
    const el = $(k);
    if (el) el.addEventListener("change", save);
  }
  $("save") && $("save").addEventListener("click", save);
  $("language") &&
    $("language").addEventListener("change", () => {
      const v = $("language").value;
      chrome.storage.sync.set({ language: v }, () => {
        applyLang(v);
        showStats(); // re-render the localized stats line
        status(bbT(currentLang, "status_saved"));
      });
    });
  $("toggleSite") && $("toggleSite").addEventListener("click", toggleSite);
  $("openOptions") &&
    $("openOptions").addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
});
