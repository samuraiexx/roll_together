// Browser compatibility layer
// This provides a unified API that works across Chrome, Firefox, and other browsers

interface BrowserAPI {
  runtime: typeof chrome.runtime;
  storage: typeof chrome.storage;
  tabs: typeof chrome.tabs;
  action?: typeof chrome.action;
  browserAction?: any; // For Manifest V2 compatibility
}

// Detect the browser API and create a unified interface
const browserAPI: BrowserAPI = (() => {
  // Check if browser global exists (Firefox)
  if (typeof (globalThis as any).browser !== 'undefined') {
    // Firefox and other browsers that use the browser namespace
    return (globalThis as any).browser as BrowserAPI;
  } else if (typeof chrome !== 'undefined') {
    // Chrome and Chromium-based browsers
    return chrome as BrowserAPI;
  } else {
    throw new Error('No browser extension API found');
  }
})();

// Export the unified API
export const extensionAPI = browserAPI;

// Helper function to get the action API (handles Manifest V2/V3 differences)
export const getActionAPI = () => {
  if (extensionAPI.action) {
    // Manifest V3 (Chrome)
    return extensionAPI.action;
  } else if (extensionAPI.browserAction) {
    // Manifest V2 (Firefox and older Chrome)
    return extensionAPI.browserAction;
  } else {
    throw new Error('No action API available');
  }
};

// Helper to check if we're running in Firefox
export const isFirefox = (): boolean => {
  return typeof (globalThis as any).browser !== 'undefined' &&
    (globalThis as any).browser.runtime &&
    typeof (globalThis as any).browser.runtime.getBrowserInfo === 'function';
};

// Helper to check if we're using Manifest V3
export const isManifestV3 = (): boolean => {
  return extensionAPI.runtime.getManifest().manifest_version === 3;
};
