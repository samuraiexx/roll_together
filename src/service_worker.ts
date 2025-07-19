import io from "socket.io-client";
import _ from "lodash";

import { log, getParameterByName, setIconColor } from "./common";
import { Message, MessageTypes, PortName, States, TabInfo } from "./types";
import { extensionAPI, getActionAPI } from "./browser-compat";

declare const process: { env: { [key: string]: string | undefined } };
declare const self: ServiceWorkerGlobalScope;

const tabsInfo: { [index: number]: TabInfo | undefined } = {};
const serverUrl = process.env.SYNC_SERVER!;

let popupPort: chrome.runtime.Port | undefined = undefined;

function handleContentScriptConnection(port: chrome.runtime.Port): void {
  const tabId = port.sender?.tab?.id!;
  const url = port.sender?.tab?.url!;

  if (_.isNil(tabsInfo[tabId])) {
    tabsInfo[tabId] = { port, tabId, sentConnectionRequest: false };
  }

  const urlRoomId: string | null = getParameterByName(url, "rollTogetherRoom");
  if (!_.isNil(urlRoomId)) {
    sendConnectionRequestToContentScript(tabId);
  } else {
    getActionAPI().enable(tabId);
  }
}

function handleContentScriptDisconnection(port: chrome.runtime.Port): void {
  const tabId = port.sender?.tab?.id!;
  getActionAPI().disable(tabId);
  disconnectWebsocket(tabId);
  delete tabsInfo[tabId];
}

function tryUpdatePopup(roomId: string | undefined = undefined): void {
  log("Trying to update popup", roomId);
  popupPort?.postMessage({
    type: MessageTypes.SW2PU_SEND_ROOM_ID,
    roomId: roomId,
  });
}

function disconnectWebsocket(tabId: number): void {
  log("Disconnecting websocket", tabId);
  const tabInfo = tabsInfo[tabId];
  if (!tabInfo) {
    log(`No tab info found for tab ${tabId}`);
    return;
  }

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

function handlePopupMessage(message: Message, port: chrome.runtime.Port): void {
  switch (message.type) {
    case MessageTypes.PU2SW_CREATE_ROOM:
      sendConnectionRequestToContentScript(message.tabId);
      break;
    case MessageTypes.PU2SW_DISCONNECT_ROOM:
      disconnectWebsocket(message.tabId);
      break;
    case MessageTypes.PU2SW_REQUEST_ROOM_ID:
      tryUpdatePopup(tabsInfo[message.tabId]?.roomId);
      break;
    default:
      throw "Invalid PopupMessageType " + message.type;
  }
}

function handleContentScriptMessage(
  message: Message,
  port: chrome.runtime.Port
): void {
  const senderUrl: string = port.sender?.tab?.url!;
  const tabId = port.sender?.tab?.id!;
  log("Received message from contentScript", { tabId, message });

  switch (message.type) {
    case MessageTypes.CS2SW_HEART_BEAT:
      break;
    case MessageTypes.CS2SW_ROOM_CONNECTION:
      connectWebsocket(
        tabId,
        message.currentProgress,
        message.state,
        getParameterByName(senderUrl)
      );
      break;
    case MessageTypes.CS2SW_LOCAL_UPDATE:
      tabsInfo[tabId]?.socket?.emit(
        "update",
        message.state,
        message.currentProgress
      );
      break;
    default:
      throw "Invalid ContentScriptMessageType " + message.type;
  }
}

function sendUpdateToContentScript(
  tabId: number,
  roomState: States,
  roomProgress: number
): void {
  log("Sending update to contentScript", { tabId, roomState, roomProgress });

  const message: Message = {
    type: MessageTypes.SW2CS_REMOTE_UPDATE,
    roomState,
    roomProgress,
  };
  tabsInfo[tabId]?.port.postMessage(message);
}

function sendConnectionRequestToContentScript(tabId: number): void {
  const tabInfo = tabsInfo[tabId];
  log({ tabsInfo, tabInfo, tabId });
  const port = tabInfo!.port!;
  const tab = port.sender!.tab!;

  if (tabInfo == undefined) {
    log(`No tab info found for tab ${tabId}`);
    return;
  }

  if (tabInfo.sentConnectionRequest) {
    log("Connection request already sent to contentScript", { tab });
    return;
  }
  tabInfo.sentConnectionRequest = true;

  if (tabInfo.socket) {
    if (getParameterByName(tab.url!, "rollTogetherRoom") === tabInfo.roomId) {
      return;
    }
    disconnectWebsocket(tabId);
  }

  log("Sending connection request to contentScript", { tab });

  const message: Message = {
    type: MessageTypes.SW2CS_ROOM_CONNECTION,
  };
  port.postMessage(message);
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

  tabInfo.socket = io(serverUrl, { query, transports: ["websocket"] });
  tabInfo.socket.on(
    "join",
    (receivedRoomId: string, roomState: States, roomProgress: number): void => {
      tabInfo.roomId = receivedRoomId;
      log("Sucessfully joined a room", {
        roomId: tabInfo.roomId,
        roomState,
        roomProgress,
      });
      tryUpdatePopup(tabInfo.roomId);
      getActionAPI().enable(tabId);
      tabInfo.sentConnectionRequest = false;

      sendUpdateToContentScript(tabId, roomState, roomProgress);
    }
  );

  tabInfo.socket.on(
    "update",
    (id: string, roomState: States, roomProgress: number): void => {
      log("Received update Message from ", id, { roomState, roomProgress });
      sendUpdateToContentScript(tabId, roomState, roomProgress);
    }
  );
}

extensionAPI.runtime.onConnect.addListener(function (port: chrome.runtime.Port) {
  log("Port connected", port.name);
  switch (port.name) {
    case PortName.POPUP:
      popupPort = port;
      log("Popup connected");

      port.onDisconnect.addListener(() => {
        popupPort = undefined;
        log("Popup disconnected");
      });
      port.onMessage.addListener(handlePopupMessage);
      break;
    case PortName.CONTENT_SCRIPT:
      handleContentScriptConnection(port);
      log(`${port.name} connected`, port.sender?.tab?.id);

      port.onDisconnect.addListener(() => {
        handleContentScriptDisconnection(port);
        log(`${port.name} disconnected`, port.sender?.tab?.id);
      });

      port.onMessage.addListener(handleContentScriptMessage);
      break;
    default:
      throw "Invalid PortName " + port.name;
  }
});

extensionAPI.runtime.onInstalled.addListener(() => {
  const canvas = new OffscreenCanvas(128, 128);
  const ctx = canvas.getContext("2d")! as OffscreenCanvasRenderingContext2D;
  setIconColor(canvas, ctx);
});

getActionAPI().disable();
self.addEventListener = _.noop;

log("Service Worker Loaded");
