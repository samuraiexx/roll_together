'use strict';

const tabsInfo = {};
const skipIntroSocket = io('https://rt-skip-intro.azurewebsites.net');
const skipIntroPendingRequests = {};

loadStyles();

chrome.tabs.onActivated.addListener(({ tabId }) => {
  getExtensionColor().then(color => setIconColor(tabId, color));
});

const regex = /http.*:\/\/www\.crunchyroll.*\/[^\/]+\/episode.*/;

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if(changeInfo.status === 'complete' && tab.url.match(regex)) {
    chrome.pageAction.show(tabId);
  } else if(changeInfo.status === 'complete') {
    chrome.pageAction.hide(tabId);
  }
});

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  getExtensionColor().then(color => setIconColor(tabId, color));
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  disconnectWebsocket(tabId);
  delete tabsInfo[tabId];
});

async function handleWebpageConnection(tab, url) {
  const tabId = tab.id;

  if (!tabsInfo[tabId]) {
    tabsInfo[tabId] = { tabId };
  }

  const urlRoomId = getParameterByName(url, 'rollTogetherRoom');
  if (urlRoomId) {
    sendConnectionRequestToWebpage(tab);
  }

  const skipIntro = await getIntroFeatureState();
  if (skipIntro) {
    log('Sending skip intro marks request.', { url });
    skipIntroSocket.emit('skip-marks', url);
    skipIntroPendingRequests[url] = true;
  }
}

function tryUpdatePopup() {
  try {
    updatePopup && updatePopup();
  } catch {
    // Do nothing as the popup is probably just closed
  }
}

function disconnectWebsocket(tabId) {
  if (!tabsInfo[tabId]) {
    return;
  }
  const { socket } = tabsInfo[tabId]

  if (socket) {
    socket.disconnect();
    delete tabsInfo[tabId].socket;
    delete tabsInfo[tabId].roomId;
  }

  tryUpdatePopup();
}

chrome.runtime.onMessage.addListener(
  function ({ state, currentProgress, type }, sender) {
    const tabId = sender.tab.id;
    const tabInfo = tabsInfo[tabId];
    const url = sender.tab.url;
    const urlRoomId = getParameterByName(url);

    log('Received webpage message', { type, state, currentProgress, url, sender });
    switch (type) {
      case WebpageMessageTypes.CONNECTION:
        handleWebpageConnection(sender.tab, url)
        break;
      case WebpageMessageTypes.ROOM_CONNECTION:
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

function sendUpdateToWebpage(tabId, roomState, roomProgress) {
  log('Sending update to webpage', { tabId, roomState, roomProgress });
  const tabInfo = tabsInfo[tabId];

  const type = BackgroundMessageTypes.REMOTE_UPDATE;
  chrome.tabs.sendMessage(tabId, { type, roomState, roomProgress });
}

function sendConnectionRequestToWebpage(tab) {
  const tabId = tab.id;
  const tabInfo = tabsInfo[tabId];

  if (tabInfo.socket != null) {
    if (getParameterByName(tab.url, 'rollTogetherRoom') === tabsInfo.roomId) {
      return;
    }
    disconnectWebsocket(tabId);
  }

  log('Sending connection request to webpage', { tab });

  chrome.tabs.sendMessage(tab.id, { type: BackgroundMessageTypes.ROOM_CONNECTION });
}

function connectWebsocket(tabId, videoProgress, videoState, urlRoomId) {
  log('Connecting websocket', { tabId, videoProgress, videoState, urlRoomId });
  const tabInfo = tabsInfo[tabId];

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
        chrome.tabs.sendMessage(tab.id, { type: BackgroundMessageTypes.SKIP_MARKS, marks });
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