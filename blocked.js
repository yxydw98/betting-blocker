document.getElementById("back").addEventListener("click", () => history.back());
document.getElementById("opts").addEventListener("click", () =>
  chrome.runtime.openOptionsPage()
);
