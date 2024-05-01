import io from "socket.io-client";
import _ from "lodash";

import {
  BackgroundMessageTypes,
  WebpageMessageTypes,
  log,
  getParameterByName,
  getExtensionColor,
  getIntroFeatureState,
  States,
  Marks,
  RemoteUpdateBackgroundMessage,
  RoomConnectionBackgroundMessage,
  SkipMarksBackgroundMessage,
  BackgroundWindow,
} from "./common";

interface TabInfo {
  tabId: number;
  socket?: SocketIOClient.Socket;
  roomId?: string;
}

const tabsInfo: { [index: number]: TabInfo | undefined } = {};
const skipIntroUrl = process.env.SKIP_INTRO_SERVER!;
const serverUrl = process.env.SYNC_SERVER!;
const window = global.window as BackgroundWindow;

function loadStyles(): void {
  const head: HTMLHeadElement = document.getElementsByTagName("head")[0];
  const link: HTMLLinkElement = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = "styles.css";
  link.media = "all";
  head.appendChild(link);
}

loadStyles();

chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {
              urlMatches: String.raw`http.?:\/\/[^\.]*\.crunchyroll\.`,
            },
          }),
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()],
      },
    ]);
  });
});

chrome.tabs.onActivated.addListener(async function ({
  tabId,
}: chrome.tabs.TabActiveInfo): Promise<void> {
  getExtensionColor().then((color) => setIconColor(tabId, color));
});

chrome.tabs.onUpdated.addListener(async function (
  tabId: number
): Promise<void> {
  getExtensionColor().then((color) => setIconColor(tabId, color));
});

chrome.tabs.onRemoved.addListener(function (tabId: number): void {
  disconnectWebsocket(tabId);
  delete tabsInfo[tabId];
});

async function handleWebpageConnection(
  tab: chrome.tabs.Tab,
  url: string
): Promise<void> {
  const tabId: number = tab.id!;

  if (_.isNil(tabsInfo[tabId])) {
    tabsInfo[tabId] = { tabId };
  }

  const urlRoomId: string | null = getParameterByName(url, "rollTogetherRoom");
  if (urlRoomId) {
    sendConnectionRequestToWebpage(tab);
  }

  const skipIntro: boolean = await getIntroFeatureState();
  if (skipIntro) {
    log("Sending skip intro marks request.", { url });
    const marks = getSkipIntroMarks(url);
  }
}

function tryUpdatePopup(): void {
  try {
    if (window.RollTogetherPopup?.update) {
      window.RollTogetherPopup.update();
    }
  } catch {
    // Do nothing as the popup is probably just closed
  }
}

function disconnectWebsocket(tabId: number): void {
  const tabInfo = tabsInfo[tabId];
  if (!tabInfo) {
    log(`No tab info found for tab ${tabId}`);
    return;
  }

  // Disconnect socket and delete data from tab info
  const { socket, roomId }: TabInfo = tabInfo;
  if (socket) {
    socket.disconnect();
    delete tabInfo.socket;
  }
  if (roomId) {
    delete tabInfo.roomId;
  }

  tryUpdatePopup();
}

interface SessionStatus {
  state: States;
  currentProgress: number;
  type: WebpageMessageTypes;
}

chrome.runtime.onMessage.addListener(function (
  { state, currentProgress, type }: SessionStatus,
  sender: chrome.runtime.MessageSender
): void {
  const tabId: number = sender.tab!.id!;
  const tabInfo = tabsInfo[tabId];
  const url: string = sender.tab!.url!;
  const urlRoomId: string | null = getParameterByName(url);

  if (!tabInfo) {
    log(`No tab info found for tab ${tabId}`);
  }

  log("Received webpage message", {
    type,
    state,
    currentProgress,
    url,
    sender,
  });
  switch (type) {
    case WebpageMessageTypes.CONNECTION:
      handleWebpageConnection(sender.tab!, url);
      break;
    case WebpageMessageTypes.ROOM_CONNECTION:
      connectWebsocket(tabId, currentProgress, state, urlRoomId);
      break;
    case WebpageMessageTypes.LOCAL_UPDATE:
      tabInfo?.socket?.emit("update", state, currentProgress);
      break;
    default:
      throw "Invalid WebpageMessageType " + type;
  }
});

function sendUpdateToWebpage(
  tabId: number,
  roomState: States,
  roomProgress: number
): void {
  log("Sending update to webpage", { tabId, roomState, roomProgress });

  const message: RemoteUpdateBackgroundMessage = {
    type: BackgroundMessageTypes.REMOTE_UPDATE,
    roomState,
    roomProgress,
  };
  chrome.tabs.sendMessage(tabId, message);
}

function sendConnectionRequestToWebpage(tab: chrome.tabs.Tab) {
  const tabId: number = tab.id!;
  const tabInfo = tabsInfo[tabId];

  if (!tabInfo) {
    log(`No tab info found for tab ${tabId}`);
  }

  if (tabInfo?.socket) {
    if (getParameterByName(tab.url!, "rollTogetherRoom") === tabInfo.roomId) {
      return;
    }
    disconnectWebsocket(tabId);
  }

  log("Sending connection request to webpage", { tab });

  const message: RoomConnectionBackgroundMessage = {
    type: BackgroundMessageTypes.ROOM_CONNECTION,
  };
  chrome.tabs.sendMessage(tab.id!, message);
}

function connectWebsocket(
  tabId: number,
  videoProgress: number,
  videoState: States,
  urlRoomId: string | null
) {
  log("Connecting websocket", {
    tabId,
    videoProgress,
    videoState,
    urlRoomId,
  });
  const tabInfo = tabsInfo[tabId];
  if (!tabInfo) {
    log(`No tab info found for tab ${tabId}`);
    return;
  }

  if (tabInfo.socket) {
    log(
      `Socket is already configured for tab ${tabId}. Disconnect existing connection before attempting to connect.`
    );
    return;
  }

  let query: string = `videoProgress=${Math.round(
    videoProgress
  )}&videoState=${videoState}${urlRoomId ? `&room=${urlRoomId}` : ""}`;

  tabInfo.socket = io(serverUrl, { query });

  tabInfo.socket.on(
    "join",
    (receivedRoomId: string, roomState: States, roomProgress: number): void => {
      tabInfo.roomId = receivedRoomId;
      log("Sucessfully joined a room", {
        roomId: tabInfo.roomId,
        roomState,
        roomProgress,
      });
      tryUpdatePopup();

      sendUpdateToWebpage(tabId, roomState, roomProgress);
    }
  );

  tabInfo.socket.on(
    "update",
    (id: string, roomState: States, roomProgress: number): void => {
      log("Received update Message from ", id, { roomState, roomProgress });
      sendUpdateToWebpage(tabId, roomState, roomProgress);
    }
  );
}

function setIconColor(tabId: number, color: string) {
  const canvas: HTMLCanvasElement = document.createElement("canvas");
  canvas.height = canvas.width = 128;

  const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
  ctx.font = "bold 92px roboto";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 20, true, false);
  ctx.fillStyle = "white";
  ctx.fillText("RT", canvas.width / 2, canvas.height / 2 + 32);

  const imageData = ctx.getImageData(0, 0, 128, 128);
  chrome.pageAction.setIcon({
    imageData,
    tabId,
  });
}

interface Radius {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | Radius | undefined,
  fill: boolean,
  stroke: boolean | undefined
): void {
  if (typeof stroke === "undefined") {
    stroke = true;
  }
  if (typeof radius === "undefined") {
    radius = 5;
  }
  if (typeof radius === "number") {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    const defaultRadius: Radius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (let prop in defaultRadius) {
      const side = prop as keyof Radius;
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius.br,
    y + height
  );
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

function getSkipIntroMarks(url: string): void {
  const xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState !== 4 || this.status !== 200) {
      log(this.responseText);
      return;
    }
    const marks = JSON.parse(this.responseText) as Marks;
    log("Found the following skipMarks", marks);

    chrome.tabs.query({ url }, function (tabs: chrome.tabs.Tab[]): void {
      tabs.forEach((tab) => {
        try {
          const message: SkipMarksBackgroundMessage = {
            type: BackgroundMessageTypes.SKIP_MARKS,
            marks,
          };
          chrome.tabs.sendMessage(tab.id!, message);
        } catch (e) {
          console.error(e);
        }
      });
    });
  };
  xhttp.open("GET", `${skipIntroUrl}?url=${encodeURIComponent(url)}`, true);
  xhttp.send();
}

window.RollTogetherBackground = {
  createRoom: sendConnectionRequestToWebpage,
  disconnectRoom: disconnectWebsocket,
  getRoomId: (tabId) => tabsInfo?.[tabId]?.roomId,
};
window.RollTogetherPopup = {};

log("Initialized");
