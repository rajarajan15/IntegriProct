chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    return { cancel: true }; // 🚫 Block the site
  },
  {
    urls: [
      "*://*.openai.com/*",
      "*://*.chat.openai.com/*",
      "*://*.bard.google.com/*",
      "*://*.claude.ai/*",
      "*://*.character.ai/*",
      "*://*.phind.com/*",
      "*://*.perplexity.ai/*",
      "*://*.you.com/*",
      "*://*.poe.com/*",
      "*://*.writesonic.com/*",
      "*://*.chatgpt.com/*"
    ]
  },
  ["blocking"]
);
