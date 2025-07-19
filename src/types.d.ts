// Additional type declarations for cross-browser compatibility

declare global {
  // Firefox WebExtensions API
  const browser: {
    runtime: typeof chrome.runtime;
    storage: typeof chrome.storage;
    tabs: typeof chrome.tabs;
    browserAction?: {
      enable: (tabId?: number) => void;
      disable: (tabId?: number) => void;
      setIcon: (details: { path: string | { [size: string]: string }; tabId?: number }) => void;
    };
  };
}

export { };
