import _ from "lodash";

import { LIMIT_DELTA_TIME, log, getEnumKeys } from "./common";

import {
  States,
  Actions,
  PlayerStateProp,
  MessageTypes,
  Message,
  PortName,
} from "./types";

const g_port = chrome.runtime.connect({ name: PortName.CONTENT_SCRIPT });

const ignoreNext: { [index: string]: boolean } = {};
let g_player: HTMLVideoElement | undefined = undefined;
let g_lastFrameProgress: number | undefined = undefined;
let g_heartBeatInterval: NodeJS.Timeout | undefined = undefined; // Keeps Service Worker alive while connected

function getState(stateName: PlayerStateProp): boolean | number {
  return g_player![stateName];
}

function getStates(): {
  state: States;
  currentProgress: number;
  timeJump: boolean;
} {
  const [paused, currentProgress]: [boolean, number] = [
    getState("paused") as boolean,
    getState("currentTime") as number,
  ];

  g_lastFrameProgress = g_lastFrameProgress || currentProgress;

  const timeJump: boolean =
    Math.abs(currentProgress - g_lastFrameProgress) > LIMIT_DELTA_TIME;
  const state: States = paused ? States.PAUSED : States.PLAYING;

  g_lastFrameProgress = currentProgress;
  return { state, currentProgress, timeJump };
}

const handleLocalAction = (action: Actions) => (): void => {
  if (ignoreNext[action] === true) {
    ignoreNext[action] = false;
    return;
  }

  const {
    state,
    currentProgress,
    timeJump,
  }: { state: States; currentProgress: number; timeJump: boolean } =
    getStates();
  const type = MessageTypes.CS2SW_LOCAL_UPDATE;

  log("Local Action", action, { type, state, currentProgress, timeJump });
  switch (action) {
    case Actions.PLAY:
    case Actions.PAUSE:
      g_port.postMessage({ type, state, currentProgress });
      break;
    case Actions.TIME_UPDATE:
      if (timeJump) {
        g_port.postMessage({ type, state, currentProgress });
      }
      break;
  }
};

function triggerAction(action: Actions, progress: number): void {
  if (_.isNil(g_player)) {
    log("Player is Undefined so no action will be triggered");
    return;
  }
  ignoreNext[action] = true;

  switch (action) {
    case Actions.PAUSE:
      g_player.pause();
      g_player.currentTime = progress;
      break;
    case Actions.PLAY:
      g_player.play();
      break;
    case Actions.TIME_UPDATE:
      g_player.currentTime = progress;
      break;
    default:
      ignoreNext[action] = false;
  }
}

function sendRoomConnectionMessage(): void {
  const { state, currentProgress }: { state: States; currentProgress: number } =
    getStates();
  const type = MessageTypes.CS2SW_ROOM_CONNECTION;
  g_port.postMessage({ state, currentProgress, type });
}

function handleRemoteUpdate(message: Message): void {
  if (message.type != MessageTypes.SW2CS_REMOTE_UPDATE) {
    throw "Invalid Message Type: " + message.type;
  }
  const { roomState, roomProgress } = message;
  log("Handling Remote Update", { roomState, roomProgress });

  const { state, currentProgress }: { state: States; currentProgress: number } =
    getStates();
  if (state !== roomState) {
    if (roomState === States.PAUSED) triggerAction(Actions.PAUSE, roomProgress);
    if (roomState === States.PLAYING) triggerAction(Actions.PLAY, roomProgress);
  }

  if (Math.abs(roomProgress - currentProgress) > LIMIT_DELTA_TIME) {
    triggerAction(Actions.TIME_UPDATE, roomProgress);
  }
}

function handleServiceWorkerMessage(serviceWorkerMessage: Message) {
  log("Received message from Background", serviceWorkerMessage);

  switch (serviceWorkerMessage.type) {
    case MessageTypes.SW2CS_ROOM_CONNECTION:
      g_heartBeatInterval = setInterval(
        () => g_port.postMessage({ type: MessageTypes.CS2SW_HEART_BEAT }),
        20000
      );
      sendRoomConnectionMessage();
      break;
    case MessageTypes.SW2CS_REMOTE_UPDATE:
      handleRemoteUpdate(serviceWorkerMessage);
      break;
    case MessageTypes.SW2CS_ROOM_DISCONNECT:
      if (g_heartBeatInterval) {
        clearInterval(g_heartBeatInterval);
      }
      break;
    default:
      throw "Invalid BackgroundMessageType: " + serviceWorkerMessage.type;
  }
}

function runContentScript() {
  g_player = document.getElementById("player0") as HTMLVideoElement;

  if (!g_player) {
    setTimeout(runContentScript, 500);
    return;
  }

  for (const action of getEnumKeys(Actions)) {
    g_player.addEventListener(
      Actions[action],
      handleLocalAction(Actions[action])
    );
  }

  g_port.onMessage.addListener(handleServiceWorkerMessage);
}

runContentScript();
