import _ from "lodash";

import {
  getBackgroundWindow,
  getExtensionColor,
  log,
  updateQueryStringParameter
} from "./common";

const backgroundWindow = getBackgroundWindow();
const popup = backgroundWindow.RollTogetherPopup;
const background = backgroundWindow.RollTogetherBackground;

const createRoomButton: HTMLButtonElement = document.getElementById("createRoom") as HTMLButtonElement;
const copyUrlButton: HTMLButtonElement = document.getElementById("copyUrl") as HTMLButtonElement;
const disconnectButton: HTMLButtonElement = document.getElementById("disconnect") as HTMLButtonElement;
const urlInput: HTMLInputElement = document.getElementById("urlInput") as HTMLInputElement;
let optionButtons: HTMLCollectionOf<HTMLButtonElement> = document.getElementsByClassName("actionButton") as HTMLCollectionOf<HTMLButtonElement>;

getExtensionColor().then((color: string): void => {
  for (let button of optionButtons) {
    log("Color of " + button.id + " is now " + color);
    button.style.backgroundColor = color;
  }
});

function update() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab: chrome.tabs.Tab = tabs[0];
    const roomId = tab.id ? background.getRoomId(tab.id) : undefined;
    const connected: boolean = !!roomId;

    log("Updating Popup...", { roomId, connected });

    if (connected) {
      const url: string = updateQueryStringParameter(tab.url!, "rollTogetherRoom", roomId!)
      urlInput.value = url;
      urlInput.focus();
      urlInput.select();

      [...document.getElementsByClassName("firstPage")].forEach(el => setElementDisplay(el, "none"));
      [...document.getElementsByClassName("secondPage")].forEach(el => setElementDisplay(el, "flex"));
    } else {
      [...document.getElementsByClassName("firstPage")].forEach(el => setElementDisplay(el, "flex"));
      [...document.getElementsByClassName("secondPage")].forEach(el => setElementDisplay(el, "none"));
    }
  });
}

function setElementDisplay(el: Element, display: string) {
  if(el instanceof HTMLElement) { 
    el.style.display = display; 
  }
}

window.addEventListener("beforeunload", (): void => {
  popup.update = undefined;
});

createRoomButton.onclick = async function (): Promise<void> {
  log("Clicking CreateRoomButton");
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs: chrome.tabs.Tab[]): void {
    background.createRoom(tabs[0]);
  });
};

copyUrlButton.onclick = function (): void {
  log("Clicking CopyUrlButton");
  urlInput.focus();
  urlInput.select();
  document.execCommand("copy");
}

disconnectButton.onclick = function (): void {
  log("Clicking DisconnectButton");
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs: chrome.tabs.Tab[]): void {
    const tabId = tabs[0].id;
    if (tabId) {
      background.disconnectRoom(tabId);
    }
  })
}

urlInput.onclick = _.noop;
popup.update = update;

update();