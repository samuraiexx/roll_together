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

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if(window.roomId !== null) return;
  if(!tab.url.startsWith('https://www.crunchyroll.com/')) return;

  const roomId = getParameterByName(tab.url);
  if(roomId === null) return;

  window.roomId = roomId;
  log('Injecting script...');
  injectScript(tab);
});

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

  webPageConnection.onDisconnect.addListener(
    function () {
      socket && socket.disconnect();
      socket = null;
      webPageConnection = null;
      window.updatePopup = null;
      window.roomId = null;
    }
  );

  webPageConnection.onMessage.addListener(
    function ({ currentProgress, initialMessage }) {
      if (!initialMessage) return;
      log('Initial message received from webpage', { currentProgress });
      connectWebsocket(currentProgress);
    }
  );
});

function sendStatusToWebpage(roomState, roomProgress) {
  if (webPageConnection)
    webPageConnection.postMessage({ roomState, roomProgress });
}

function connectWebsocket(videoProgress) {
  const { roomId, updatePopup } = window;
  let query = `videoProgress=${Math.round(videoProgress)}` + (roomId ? `&room=${roomId}` : '');

  socket = io('https://crunchy-party.herokuapp.com/', { query });

  socket.on('join', (roomId, roomState, roomProgress) => {
    window.roomId = roomId;
    log('Sucessfully joined a room', { roomId, roomState, roomProgress });
    updatePopup && updatePopup();

    sendStatusToWebpage(roomState, roomProgress);
  });

  socket.on('update', (id, roomState, roomProgress) => {
    log('Received update Message from ', id, { roomState, roomProgress });
    sendStatusToWebpage(roomState, roomProgress);
  });

  webPageConnection.onMessage.addListener(
    function ({ state, currentProgress }) {
      log('Received webpage update', { state, currentProgress });

      socket.emit('update', state, currentProgress);
    }
  );
}