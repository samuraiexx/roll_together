'use strict';

window.updatePopup = null;

let webPageConnection = null;
let socket = null;
let roomId = null;

loadStyles();

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

chrome.tabs.onActivated.addListener(async function ({tabId}) {
  const color = await getExtensionColor();
  setIconColor(tabId, color);
})

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

  socket = io('https://roll-together.herokuapp.com/', { query });

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
    radius = {tl: radius, tr: radius, br: radius, bl: radius};
  } else {
    const defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
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

window.createRoom = sendConnectionRequestToWebpage;
window.disconnectRoom = disconnectWebsocket;
window.getRoomId = () => roomId;

function loadStyles() {
  const head  = document.getElementsByTagName('head')[0];
  const link  = document.createElement('link');
  link.rel  = 'stylesheet';
  link.type = 'text/css';
  link.href = 'styles.css';
  link.media = 'all';
  head.appendChild(link);
}

log("Initialized");