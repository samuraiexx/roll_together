(async () => {
  const src = chrome.runtime.getURL("build/content_main.js");
  const contentMain = await import(src);
  contentMain.runContentScript();
})();