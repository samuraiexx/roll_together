'use strict';

window.roomId = null;
let webPageConnection = null;
let socket = null;

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

  trySetupWebpageConnection();
});

function connectWebsocket(urlRoomId, updatePopup) {
  const query = urlRoomId ? `room=${urlRoomId}` : '';
  socket = io('https://crunchy-party.herokuapp.com', { query });

  socket.on('room', receivedRoomId => {
    window.roomId = receivedRoomId;
    log({ receivedRoomId, updatePopup });
    updatePopup && updatePopup();
  });

  socket.on(Actions.PLAY, (id) => {
    log('Received Play Message from ', id);
    webPageConnection.postMessage({ remoteAction: Actions.PLAY });
  });

  socket.on(Actions.PAUSE, (id) => {
    log('Received Pause Message from ', id);
    webPageConnection.postMessage({ remoteAction: Actions.PAUSE });
  });

  trySetupWebpageConnection();
}

function trySetupWebpageConnection() {
  if (!webPageConnection || !socket) {
    return;
  }

  webPageConnection.onMessage.addListener(
    function (request) {
      const action = request.localAction;
      log('Received webpage request', action);

      socket.emit(action);
    }
  );
}