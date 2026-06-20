/* Shared logic for both the popup and the full options page.
   Each control is wired only if it exists on the current page. */

const DEFAULTS = {
  enabled: true,
  blockNavigation: true,
  aggressiveAllSites: false,
  hideVote: false,
  hideForumLink: true,
  debug: false,
  aggressiveHosts: ["hltv.org"],
  extraDomains: [],
  extraTextKeywords: [],
};

const FIELDS = {
  enabled: "checkbox",
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

function load() {
  chrome.storage.sync.get(DEFAULTS, (cfg) => {
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
    chrome.storage.sync.set(out, () => status("Saved."));
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
    btn.textContent = on
      ? "Aggressive mode: ON — turn off"
      : "Aggressive mode: OFF — turn on";
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
      status("Updated — reload the page to apply.");
    });
  });
}

function showStats() {
  const el = $("stats");
  if (!el) return;
  fetch(chrome.runtime.getURL("data/lists.json"))
    .then((r) => r.json())
    .then((l) => {
      el.textContent = `Blocklist: ${l.domains.length} gambling domains, ${l.brands.length} brands, ${l.textKeywords.length} keyword phrases.`;
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
  $("toggleSite") && $("toggleSite").addEventListener("click", toggleSite);
  $("openOptions") &&
    $("openOptions").addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
});
