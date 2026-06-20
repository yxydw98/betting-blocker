/* Lightweight self-managed i18n for the extension UI (popup, options, blocked
 * page). Independent of the browser's locale: the user picks the language and
 * it's stored in chrome.storage (`language`: "auto" | "en" | "zh").
 *
 * HTML elements opt in with attributes:
 *   data-i18n="key"        -> sets textContent
 *   data-i18n-ph="key"     -> sets the placeholder attribute
 *   data-i18n-title="key"  -> sets document.title
 * Dynamic strings (built in JS) use bbT(lang, key).
 */
const BB_I18N = {
  en: {
    // popup
    popup_title: "Betting Blocker",
    enabled: "Extension enabled",
    block_nav: "Block visiting betting sites",
    this_site: "This site:",
    all_settings: "All settings…",
    aggr_btn: "Aggressive mode",
    aggr_on: "Aggressive mode: ON — turn off",
    aggr_off: "Aggressive mode: OFF — turn on",
    status_saved: "Saved.",
    status_updated: "Updated — reload the page to apply.",
    // options
    options_title: "Betting Blocker — Settings",
    app_h1: "Betting Blocker",
    subtitle:
      "Blocks betting & gambling everywhere. Conservative on all sites; aggressive on the ones you opt in.",
    sec_general: "General",
    enabled_desc: "Master switch.",
    block_nav_desc:
      'Redirect navigations to any blocklisted gambling domain to a "blocked" page. Off = only embedded betting widgets/ads are blocked.',
    debug: "Debug logging",
    debug_desc: "Log hidden-element counts to the page console.",
    sec_aggr: "Aggressive mode",
    aggr_hint:
      "Aggressive mode also removes betting links, brand widgets, and gambling keywords from the page — not just known domains. Network-level domain blocking happens on all sites regardless of this setting.",
    aggr_all_label: "Aggressive mode on all sites",
    beta: "(beta)",
    aggr_all_desc:
      "Scrub betting from every site you visit. More thorough, but may hide legitimate content on sports/news sites. Leave off to scrub only the sites listed below.",
    aggr_hosts_label: "Aggressive on these sites only",
    aggr_hosts_hint:
      'Used when the "all sites" beta above is off. One host per line. (Add the current site quickly from the toolbar popup.)',
    sec_hltv: "HLTV options",
    hide_forum: "Hide the betting forum link",
    hide_forum_desc: "Removes /forums/betting from the nav.",
    hide_vote: 'Hide the "Pick a winner" vote',
    hide_vote_desc:
      "The free community win-probability vote. Off by default — it's not real-money betting.",
    sec_custom: "Custom blocklist",
    extra_domains_label: "Extra domains to block (network-level, all sites)",
    extra_domains_hint:
      "One domain per line, e.g. newbookie.com. Subdomains included automatically.",
    extra_kw_label: "Extra keyword phrases (aggressive sites)",
    extra_kw_hint:
      "One phrase per line. Matched in visible text on aggressive sites only.",
    sec_language: "Language",
    language_label: "Interface language",
    lang_auto: "Auto (follow browser)",
    save: "Save",
    stats_tpl:
      "Blocklist: {g} gambling domains, {b} brands, {p} betting phrases.",
    // blocked page
    blocked_title: "Betting site blocked",
    blocked_desc:
      "Betting Blocker stopped this page from loading because it matched a gambling / bookmaker domain.",
    back: "Go back",
    settings: "Settings",
  },

  zh: {
    // popup
    popup_title: "投注拦截器",
    enabled: "启用扩展",
    block_nav: "拦截访问博彩网站",
    this_site: "当前网站：",
    all_settings: "全部设置…",
    aggr_btn: "激进模式",
    aggr_on: "激进模式：已开启 — 点此关闭",
    aggr_off: "激进模式：已关闭 — 点此开启",
    status_saved: "已保存。",
    status_updated: "已更新 — 重新加载页面后生效。",
    // options
    options_title: "投注拦截器 — 设置",
    app_h1: "投注拦截器",
    subtitle:
      "在所有网站拦截博彩与赌博内容。默认对所有网站采用保守模式；仅对你指定的网站启用激进模式。",
    sec_general: "常规",
    enabled_desc: "总开关。",
    block_nav_desc:
      "将访问任何名单内博彩域名的导航跳转到“已拦截”页面。关闭后仅拦截页面内嵌的博彩组件/广告。",
    debug: "调试日志",
    debug_desc: "在页面控制台输出被隐藏元素的数量。",
    sec_aggr: "激进模式",
    aggr_hint:
      "激进模式还会从页面中移除博彩链接、品牌组件和赌博关键词，而不仅是已知域名。无论此设置如何，网络层域名拦截都会在所有网站生效。",
    aggr_all_label: "对所有网站启用激进模式",
    beta: "（测试版）",
    aggr_all_desc:
      "在你访问的每个网站清除博彩内容。更彻底，但可能在体育/新闻网站隐藏正常内容。关闭则仅清理下方列出的网站。",
    aggr_hosts_label: "仅对以下网站启用激进模式",
    aggr_hosts_hint:
      "当上方“所有网站”测试版关闭时生效。每行一个域名。（可通过工具栏弹窗快速添加当前网站。）",
    sec_hltv: "HLTV 选项",
    hide_forum: "隐藏博彩论坛链接",
    hide_forum_desc: "从导航栏移除 /forums/betting。",
    hide_vote: "隐藏“胜负预测”投票",
    hide_vote_desc:
      "免费的社区胜率投票。默认关闭 — 它并非真钱投注。",
    sec_custom: "自定义拦截列表",
    extra_domains_label: "额外拦截的域名（网络层，所有网站）",
    extra_domains_hint:
      "每行一个域名，例如 newbookie.com。自动包含其子域名。",
    extra_kw_label: "额外关键词短语（激进模式网站）",
    extra_kw_hint: "每行一个短语。仅在激进模式网站的可见文本中匹配。",
    sec_language: "语言",
    language_label: "界面语言",
    lang_auto: "自动（跟随浏览器）",
    save: "保存",
    stats_tpl:
      "拦截列表：{g} 个博彩域名、{b} 个品牌、{p} 条投注短语。",
    // blocked page
    blocked_title: "已拦截博彩网站",
    blocked_desc:
      "投注拦截器已阻止此页面加载，因为它匹配到赌博/博彩公司域名。",
    back: "返回",
    settings: "设置",
  },
};

function bbResolveLang(setting) {
  if (setting === "en" || setting === "zh") return setting;
  try {
    return (chrome.i18n.getUILanguage() || "").toLowerCase().startsWith("zh")
      ? "zh"
      : "en";
  } catch {
    return "en";
  }
}

function bbT(lang, key) {
  return (BB_I18N[lang] && BB_I18N[lang][key]) || BB_I18N.en[key] || key;
}

function bbApply(lang) {
  document.documentElement.lang = lang === "zh" ? "zh" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = bbT(lang, el.getAttribute("data-i18n"));
    if (v) el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const v = bbT(lang, el.getAttribute("data-i18n-ph"));
    if (v) el.setAttribute("placeholder", v);
  });
  const t = document.querySelector("[data-i18n-title]");
  if (t) document.title = bbT(lang, t.getAttribute("data-i18n-title"));
}

// expose for the page scripts
window.bbResolveLang = bbResolveLang;
window.bbT = bbT;
window.bbApply = bbApply;
window.BB_I18N = BB_I18N;
