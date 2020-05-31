const background = chrome.extension.getBackgroundPage();
let connected = false;

const createRoomButton = document.getElementById('createRoom');
const copyUrlButton = document.getElementById('copyUrl');
const disconnectButton = document.getElementById('disconnect');
const urlInput = document.getElementById('urlInput');

function executeScript(tabId, obj) {
  return new Promise(
    callback => chrome.tabs.executeScript(tabId, obj, callback)
  );
}

function update() {
  const roomId = background.window.getRoomId();
  const connected = roomId != null;
  log('Updating Popup...', { roomId, connected });

  if (connected) {
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
      const roomId = background.window.getRoomId();
      const url = updateQueryStringParameter(tabs[0].url, 'crunchyPartyRoom', roomId)
      urlInput.value = url;
      urlInput.focus();
      urlInput.select();
    });

    [...document.getElementsByClassName('firstPage')].forEach(el => el.style.display = 'none');
    [...document.getElementsByClassName('secondPage')].forEach(el => el.style = {});
  } else {
    [...document.getElementsByClassName('firstPage')].forEach(el => el.style = {});
    [...document.getElementsByClassName('secondPage')].forEach(el => el.style.display = 'none');
  }
}
background.window.updatePopup = update;
update();

window.addEventListener('beforeunload', () => {
  background.window.updatePopup = null;
});

createRoomButton.onclick = async function () {
  log('Clicking CreateRoomButton');
  chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
    background.window.createRoom(tabs[0]);
  });
};

copyUrlButton.onclick = function () {
  log('Clicking CopyUrlButton');
  urlInput.focus();
  urlInput.select();
  document.execCommand('copy');
}

disconnectButton.onclick = function () {
  log('Clicking DisconnectButton');
  background.window.disconnectRoom();
}

urlInput.onclick = function () {
}