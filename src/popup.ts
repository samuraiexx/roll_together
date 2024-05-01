import _ from "lodash";
import { getExtensionColor, log, updateQueryStringParameter } from "./common";
import { Message, MessageTypes, PortName } from "./types";

const createRoomButton: HTMLButtonElement = document.getElementById(
  "createRoom"
) as HTMLButtonElement;
const copyUrlButton: HTMLButtonElement = document.getElementById(
  "copyUrl"
) as HTMLButtonElement;
const disconnectButton: HTMLButtonElement = document.getElementById(
  "disconnect"
) as HTMLButtonElement;
const urlInput: HTMLInputElement = document.getElementById(
  "urlInput"
) as HTMLInputElement;
let optionButtons: HTMLCollectionOf<HTMLButtonElement> =
  document.getElementsByClassName(
    "actionButton"
  ) as HTMLCollectionOf<HTMLButtonElement>;

declare const navigator: Navigator;

// Global Variables
const g_port = chrome.runtime.connect({ name: PortName.POPUP });

// Service Worker Message Handlers
g_port.onMessage.addListener((message: Message) => {
  if (message.type != MessageTypes.SW2PU_SEND_ROOM_ID) {
    throw "Invalid Message Type: " + message.type;
  }

  const roomId = message.roomId;
  const connected: boolean = !!roomId;
  log("Updating Popup UX", { roomId, connected });

  if (!connected) {
    renderDisconnectedPage();
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab: chrome.tabs.Tab = tabs[0];
    const url: string = updateQueryStringParameter(
      tab.url!,
      "rollTogetherRoom",
      `${roomId}`
    );

    urlInput.value = url;
    urlInput.focus();
    urlInput.select();

    renderConnectedPage();
  });
});

// HTML Element Event Handlers
createRoomButton.onclick = async function (): Promise<void> {
  log("Clicking CreateRoomButton");
  chrome.tabs.query(
    { active: true, currentWindow: true },
    function (tabs: chrome.tabs.Tab[]): void {
      const tabId = tabs[0].id;
      g_port.postMessage({ type: MessageTypes.PU2SW_CREATE_ROOM, tabId });
    }
  );
};

copyUrlButton.onclick = function (): void {
  log("Clicking CopyUrlButton");
  urlInput.focus();
  urlInput.select();
  copyTextToClipboard(urlInput.value);
};

disconnectButton.onclick = function (): void {
  log("Clicking DisconnectButton");
  chrome.tabs.query(
    { active: true, currentWindow: true },
    function (tabs: chrome.tabs.Tab[]): void {
      const tabId = tabs[0].id;
      if (tabId) {
        g_port.postMessage({ type: MessageTypes.PU2SW_DISCONNECT_ROOM, tabId });
      }
    }
  );
};

// Tab Event Listeners
chrome.tabs.onActivated.addListener((activeInfo) => {
  requestRoomId();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  requestRoomId();
});

urlInput.onclick = _.noop;

getExtensionColor().then((color: string): void => {
  for (let button of Array.from(optionButtons)) {
    log("Color of " + button.id + " is now " + color);
    button.style.backgroundColor = color;
  }
});

// Helper Functions
function renderDisconnectedPage() {
  Array.from(document.getElementsByClassName("firstPage")).forEach((el) =>
    setElementDisplay(el, "flex")
  );
  Array.from(document.getElementsByClassName("secondPage")).forEach((el) =>
    setElementDisplay(el, "none")
  );
}

function renderConnectedPage() {
  Array.from(document.getElementsByClassName("firstPage")).forEach((el) =>
    setElementDisplay(el, "none")
  );
  Array.from(document.getElementsByClassName("secondPage")).forEach((el) =>
    setElementDisplay(el, "flex")
  );
}

function requestRoomId() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab: chrome.tabs.Tab = tabs[0];
    if (tab.id) {
      g_port.postMessage({
        type: MessageTypes.PU2SW_REQUEST_ROOM_ID,
        tabId: tab.id,
      });
    } else {
      renderDisconnectedPage();
    }
  });
}

function setElementDisplay(el: Element, display: string) {
  if (el instanceof HTMLElement) {
    el.style.display = display;
  }
}

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    log("Text copied to clipboard");
  } catch (err) {
    log("Failed to copy text: ", err);
  }
}

requestRoomId();
