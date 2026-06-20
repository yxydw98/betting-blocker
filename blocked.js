// Localize using the saved language setting.
chrome.storage.sync.get({ language: "auto" }, ({ language }) => {
  try {
    bbApply(bbResolveLang(language));
  } catch {}
});

document.getElementById("back").addEventListener("click", () => history.back());
document.getElementById("opts").addEventListener("click", () =>
  chrome.runtime.openOptionsPage()
);
