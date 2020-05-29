'use strict';

window.roomId = null;
window.updatePopup = null;

let webPageConnection = null;
let socket = null;

log("Initialized");

function executeScript(tabId, obj) {
  return new Promise(
    callback => chrome.tabs.executeScript(tabId, obj, callback)
  );
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostEquals: 'www.crunchyroll.com' },
      })],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});

chrome.runtime.onConnectExternal.addListener(port => {
  webPageConnection = port;

  webPageConnection.onMessage.addListener(
    function ({ currentProgress, initialMessage }) {
      if(!initialMessage) return;
      log('Initial message received from webpage', {currentProgress});
      connectWebsocket(currentProgress);
    }
  );
});

function connectWebsocket(videoProgress) {
  const { roomId, updatePopup } = window;
  let query = `videoProgress=${Math.round(videoProgress)}` + (roomId ? `&room=${roomId}` : '');

  socket = io('https://crunchy-party.herokuapp.com/', { query });

  socket.on('join', (roomId, roomState, roomProgress) => {
    window.roomId = roomId;
    log('Sucessfully joined a room', { roomId, roomState, roomProgress });
    updatePopup && updatePopup();

    webPageConnection.postMessage({ roomState, roomProgress });
  });

  socket.on('update', (id, roomState, roomProgress) => {
    log('Received update Message from ', id, { roomState, roomProgress });
    webPageConnection.postMessage({ roomState, roomProgress });
  });

  webPageConnection.onMessage.addListener(
    function ({ state, currentProgress }) {
      log('Received webpage update', { state, currentProgress });

      socket.emit('update', state, currentProgress);
    }
  );
}