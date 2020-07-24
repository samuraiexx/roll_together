const background = chrome.extension.getBackgroundPage();
let connected = false;

const createRoomButton = document.getElementById('createRoom');
const copyUrlButton = document.getElementById('copyUrl');
const disconnectButton = document.getElementById('disconnect');
const urlInput = document.getElementById('urlInput');
let optionButtons = document.getElementsByClassName('actionButton');

getExtensionColor().then( color => {
  for (button of optionButtons) {
    log("Color of " + button.id + " is now " + color);
    button.style.backgroundColor = color;
  }
});

function executeScript(tabId, obj) {
  return new Promise(
    callback => chrome.tabs.executeScript(tabId, obj, callback)
  );
}

function update() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs[0];
    const roomId = background.window.getRoomId(tab.id);
    const connected = roomId != null;

    log('Updating Popup...', { roomId, connected });

    if (connected) {
      const url = updateQueryStringParameter(tab.url, 'rollTogetherRoom', roomId)
      urlInput.value = url;
      urlInput.focus();
      urlInput.select();

      [...document.getElementsByClassName('firstPage')].forEach(el => el.style.display = 'none');
      [...document.getElementsByClassName('secondPage')].forEach(el => el.style = {});
    } else {
      [...document.getElementsByClassName('firstPage')].forEach(el => el.style = {});
      [...document.getElementsByClassName('secondPage')].forEach(el => el.style.display = 'none');
    }
  });
}

window.addEventListener('beforeunload', () => {
  background.window.updatePopup = null;
});

createRoomButton.onclick = async function () {
  log('Clicking CreateRoomButton');
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
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
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    background.window.disconnectRoom(tabs[0].id);
  })
}

urlInput.onclick = function () {
}

background.window.updatePopup = update;

update();
