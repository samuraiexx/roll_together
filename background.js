'use strict';

window.updatePopup = null;

let webPageConnection = null;
let socket = null;
let roomId = null;

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (roomId != null) return;
  if (!tab.url.startsWith('https://www.crunchyroll.com/')) return;

  const urlRoomId = getParameterByName(tab.url);
  log('Updated tab', { tab, urlRoomId });
  if (urlRoomId == null) return;

  sendConnectionRequestToWebpage(tab);
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

function tryUpdatePopup() {
  const { updatePopup } = window;

  try {
    updatePopup && updatePopup();
  } catch {
    // Do nothing as the popup is probably just closed
  }
}

function disconnectWebsocket() {
  socket && socket.disconnect();
  socket = null;
  roomId = null;

  tryUpdatePopup();
}

chrome.runtime.onConnectExternal.addListener(port => {
  webPageConnection = port;

  webPageConnection.onDisconnect.addListener(
    function () {
      disconnectWebsocket();
      webPageConnection = null;
      window.updatePopup = null;
    }
  );

  webPageConnection.onMessage.addListener(
    function ({ state, currentProgress, urlRoomId, type }) {
      log('Received webpage message', { type, state, currentProgress });
      switch (type) {
        case (WebpageMessageTypes.CONNECTION):
          connectWebsocket(currentProgress, state, urlRoomId);
          break;
        case (WebpageMessageTypes.LOCAL_UPDATE):
          socket && socket.emit('update', state, currentProgress);
          break;
        default:
          throw "Invalid WebpageMessageType " + type;
      }
    }
  );
});

function sendUpdateToWebpage(roomState, roomProgress) {
  if (webPageConnection) {
    const type = BackgroundMessageTypes.REMOTE_UPDATE;
    webPageConnection.postMessage({ type, roomState, roomProgress });
  }
}

async function sendConnectionRequestToWebpage(tab) {
  await injectScript(tab);

  if (webPageConnection) {
    webPageConnection.postMessage({ type: BackgroundMessageTypes.CONNECTION });
  }
}

function connectWebsocket(videoProgress, videoState, urlRoomId) {
  if (socket != null) return;

  let query = `videoProgress=${Math.round(videoProgress)}&videoState=${videoState}${(urlRoomId ? `&room=${urlRoomId}` : '')}`;

  socket = io('https://crunchy-party.herokuapp.com/', { query });

  socket.on('join', (receivedRoomId, roomState, roomProgress) => {
    roomId = receivedRoomId;
    log('Sucessfully joined a room', { roomId, roomState, roomProgress });
    tryUpdatePopup();

    sendUpdateToWebpage(roomState, roomProgress);
  });

  socket.on('update', (id, roomState, roomProgress) => {
    log('Received update Message from ', id, { roomState, roomProgress });
    sendUpdateToWebpage(roomState, roomProgress);
  });
}

const injectScript = async (tab) => {
  log('Injecting script...');
  const commonCodeResponse = await fetch('common.js');
  const commonCode = (await commonCodeResponse.text())
    .replace(/\\/g, '\\\\')
    .replace(/\`/g, '\\\`');

  await executeScript(
    tab.id,
    { code: `commonCode = \`${commonCode}\`;` }
  );
  await executeScript(tab.id, { file: 'content_script.js' });
}

window.createRoom = sendConnectionRequestToWebpage;
window.disconnectRoom = disconnectWebsocket;
window.getRoomId = () => roomId;

log("Initialized");