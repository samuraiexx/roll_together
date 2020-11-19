import _ from 'lodash';

import {
  getExtensionColor,
  log,
  updateQueryStringParameter
} from "./common";

declare global {
  interface Window {
    getRoomId: any;
    updatePopup: any;
    createRoom: any;
    disconnectRoom: any;
    imageData: any;
    data: any;
  }
}

const background: Window = chrome.extension.getBackgroundPage();

const createRoomButton: HTMLButtonElement = document.getElementById('createRoom') as HTMLButtonElement;
const copyUrlButton: HTMLButtonElement = document.getElementById('copyUrl') as HTMLButtonElement;
const disconnectButton: HTMLButtonElement = document.getElementById('disconnect') as HTMLButtonElement;
const urlInput: HTMLInputElement = document.getElementById('urlInput') as HTMLInputElement;
let optionButtons: HTMLCollectionOf<HTMLButtonElement> = document.getElementsByClassName('actionButton') as HTMLCollectionOf<HTMLButtonElement>;

getExtensionColor().then((color: string): void => {
  for (let button of optionButtons) {
    log("Color of " + button.id + " is now " + color);
    button.style.backgroundColor = color;
  }
});

function update() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab: chrome.tabs.Tab = tabs[0];
    const roomId: string = background.window.getRoomId(tab.id);
    const connected: boolean = roomId != null;

    log('Updating Popup...', { roomId, connected });

    if (connected) {
      const url: string = updateQueryStringParameter(tab.url, 'rollTogetherRoom', roomId)
      urlInput.value = url;
      urlInput.focus();
      urlInput.select();

      [...document.getElementsByClassName('firstPage')].forEach((el: HTMLElement): void => { el.style.display = 'none' });
      [...document.getElementsByClassName('secondPage')].forEach((el: HTMLElement): void => { el.style.display = 'flex' });
    } else {
      [...document.getElementsByClassName('firstPage')].forEach((el: HTMLElement): void => { el.style.display = 'flex' });
      [...document.getElementsByClassName('secondPage')].forEach((el: HTMLElement): void => { el.style.display = 'none' });
    }
  });
}

window.addEventListener('beforeunload', (): void => {
  background.window.updatePopup = null;
});

createRoomButton.onclick = async function (): Promise<void> {
  log('Clicking CreateRoomButton');
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs: chrome.tabs.Tab[]): void {
    background.window.createRoom(tabs[0]);
  });
};

copyUrlButton.onclick = function (): void {
  log('Clicking CopyUrlButton');
  urlInput.focus();
  urlInput.select();
  document.execCommand('copy');
}

disconnectButton.onclick = function (): void {
  log('Clicking DisconnectButton');
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs: chrome.tabs.Tab[]): void {
    background.window.disconnectRoom(tabs[0].id);
  })
}

urlInput.onclick = _.noop;
background.window.updatePopup = update;

update();