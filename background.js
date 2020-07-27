'use strict';
const tabsInfo = {};
let skipIntro = null;
const skipIntroSocket = io('https://rt-skip-intro.azurewebsites.net');
const skipIntroPendingRequests = {}

loadStyles();

const regex = /http.*:\/\/www\.crunchyroll.*\/[^\/]+\/episode.*/;
chrome.tabs.onActivated.addListener(({ tabId }) => {
  getExtensionColor().then(color => setIconColor(tabId, color));
  getIntroFeatureState().then(state => skipIntro = state);
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { urlMatches: 'http.*:\/\/www\.crunchyroll.*\/[^\/]+\/episode.*' },
      })],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  getIntroFeatureState().then(state => skipIntro = state);
  getExtensionColor().then(color => setIconColor(tabId, color));

  if (!regex.test(tab.url)) {
    return;
  }

  if (!tabsInfo[tabId]) {
    tabsInfo[tabId] = { tabId }
  }

  await injectScript(tab);

  const urlRoomId = getParameterByName(tab.url, 'rollTogetherRoom');
  if (urlRoomId) {
    sendConnectionRequestToWebpage(tab)
  }
});

function tryUpdatePopup() {
  try {
    updatePopup && updatePopup();
  } catch {
    // Do nothing as the popup is probably just closed
  }
}

function disconnectWebsocket(tabId) {
  const { socket } = tabsInfo[tabId]

  if (socket) {
    socket.disconnect();
    delete tabsInfo[tabId].socket;
    delete tabsInfo[tabId].roomId;
  }

  tryUpdatePopup();
}

chrome.runtime.onConnectExternal.addListener(port => {
  const tabId = port.sender.tab.id
  const tabInfo = tabsInfo[tabId]

  tabInfo.webPageConnection = port

  tabInfo.webPageConnection.onDisconnect.addListener(
    function () {
      disconnectWebsocket(tabId);
      delete tabsInfo[tabId]
    }
  );

  tabInfo.webPageConnection.onMessage.addListener(
    function ({ state, currentProgress, urlRoomId, type }) {
      log('Received webpage message', { type, state, currentProgress });
      switch (type) {
        case (WebpageMessageTypes.CONNECTION):
          connectWebsocket(tabId, currentProgress, state, urlRoomId);
          break;
        case (WebpageMessageTypes.LOCAL_UPDATE):
          tabInfo.socket && tabInfo.socket.emit('update', state, currentProgress);
          break;
        default:
          throw "Invalid WebpageMessageType " + type;
      }
    }
  );

  if (skipIntro) {
    const url = port.sender.tab.url;
    log('Sending skip intro marks request.', { url })
    skipIntroSocket.emit('skip-marks', url)
    skipIntroPendingRequests[url] = true;
  }
});

function sendUpdateToWebpage(tabId, roomState, roomProgress) {
  log('Sending update to webpage', { tabId, roomState, roomProgress });
  const tabInfo = tabsInfo[tabId];

  if (tabInfo.webPageConnection) {
    const type = BackgroundMessageTypes.REMOTE_UPDATE;
    tabInfo.webPageConnection.postMessage({ type, roomState, roomProgress });
  }
}

function sendConnectionRequestToWebpage(tab) {
  if (tabsInfo[tab.id].socket) return;

  log('Sending connection request to webpage', { tab });
  const { webPageConnection } = tabsInfo[tab.id];

  if (webPageConnection) {
    webPageConnection.postMessage({ type: BackgroundMessageTypes.CONNECTION });
  }
}

function connectWebsocket(tabId, videoProgress, videoState, urlRoomId) {
  log('Connecting websocket', { tabId, videoProgress, videoState, urlRoomId });
  const tabInfo = tabsInfo[tabId];
  if (tabInfo.socket != null) return;

  let query = `videoProgress=${Math.round(videoProgress)}&videoState=${videoState}${(urlRoomId ? `&room=${urlRoomId}` : '')}`;

  tabInfo.socket = io('https://roll-together.herokuapp.com/', { query });

  tabInfo.socket.on('join', (receivedRoomId, roomState, roomProgress) => {
    tabInfo.roomId = receivedRoomId;
    log('Sucessfully joined a room', { roomId: tabInfo.roomId, roomState, roomProgress });
    tryUpdatePopup();

    sendUpdateToWebpage(tabId, roomState, roomProgress);
  });

  tabInfo.socket.on('update', (id, roomState, roomProgress) => {
    log('Received update Message from ', id, { roomState, roomProgress });
    sendUpdateToWebpage(tabId, roomState, roomProgress);
  });
}

const injectScript = async (tab) => {
  log('Trying to inject script...');
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

function setIconColor(tabId, color) {
  const canvas = document.createElement('canvas');
  canvas.height = canvas.width = 128;

  const ctx = canvas.getContext("2d");
  ctx.font = "bold 92px roboto";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 20, true, false);
  ctx.fillStyle = 'white';
  ctx.fillText("RT", canvas.width / 2, canvas.height / 2 + 32);

  const imageData = ctx.getImageData(0, 0, 128, 128);
  window.imageData = imageData;

  window.data = imageData;
  chrome.pageAction.setIcon({
    imageData,
    tabId
  });
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke === 'undefined') {
    stroke = true;
  }
  if (typeof radius === 'undefined') {
    radius = 5;
  }
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

function loadStyles() {
  const head = document.getElementsByTagName('head')[0];
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = 'styles.css';
  link.media = 'all';
  head.appendChild(link);
}

skipIntroSocket.on('skip-marks', ({ url, marks, error }) => {
  log('Receiving skip intro marks response', { url, marks, error })
  delete skipIntroPendingRequests[url];
  if (error) {
    return;
  }

  chrome.tabs.query({ url }, function (tabs) {

    tabs.forEach(tab => {
      try {
        const tabInfo = tabsInfo[tab.id];
        if (!tabInfo || !tabInfo.webPageConnection) {
          return;
        }

        tabInfo.webPageConnection.postMessage({ type: BackgroundMessageTypes.SKIP_MARKS, marks });
      } catch (e) {
        console.error(e);
      }
    })
  })
})

skipIntroSocket.on('reconnect', () => {
  log('Reconnected')
  for (const url in skipIntroPendingRequests) {
    skipIntroSocket.emit('skip-marks', url)
  }
})

window.updatePopup = null;
window.createRoom = sendConnectionRequestToWebpage;
window.disconnectRoom = disconnectWebsocket;
window.getRoomId = (tabId) => tabsInfo[tabId] && tabsInfo[tabId].roomId;

log("Initialized");