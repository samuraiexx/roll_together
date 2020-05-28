'use strict';
window.roomId = null;
let webPageConnection = null;

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
  console.log("Connected to extension messaging system", port);
  console.assert(port.name == "crunchyParty");
  webPageConnection = port;
  window.webPageConnection = port;
});

function connectWebsocket(urlRoomId, updatePopup) {
  const query = urlRoomId ? `room=${urlRoomId}` : '';
  const socket = io('https://crunchyroll-party.herokuapp.com', { query });

  socket.on('room', receivedRoomId => {
    window.roomId = receivedRoomId;
    console.log({ receivedRoomId, updatePopup });
    updatePopup && updatePopup();
  });

  socket.on('play', (id) => {
    console.log('Received Play Message from ', id);
    webPageConnection.postMessage({ crunchyPartyActionReceived: "play" });
  });

  socket.on('pause', (id) => {
    console.log('Received Pause Message from ', id);
    webPageConnection.postMessage({ crunchyPartyActionReceived: "pause" });
  });

  webPageConnection.onMessage.addListener(
    function (request) {
      const action = request.crunchyPartyAction;
      console.log('Received webpage request', action);

      switch (action) {
        case "play":
          socket.emit('play');
          break;
        case "pause":
          socket.emit('pause');
          break;
        default:
          break;
      }
    });
}