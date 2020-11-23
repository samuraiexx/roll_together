import {
  LIMIT_DELTA_TIME,
  States,
  log,
  Actions,
  WebpageMessageTypes,
  BackgroundMessageTypes
} from "./common";

import { Marks } from "./background";

const ignoreNext: { [index: string]: boolean } = {};

let player: HTMLVideoElement = null;
let lastFrameProgress: number = null;

let beginIntro: number = null;
let endIntro: number = null;
let skipButton: HTMLButtonElement = null;
let currentSkipButtonState: skipButtonStates = null;

enum skipButtonStates {
  CONSTANT = 'constant',
  HOVER = 'hover',
  HIDDEN = 'hidden'
};

function getState(stateName: string): boolean | number {
  return player[stateName];
}

function getStates(): { state: States, currentProgress: number, timeJump: boolean } {
  const [paused, currentProgress]: [boolean, number] = [
    getState("paused") as boolean,
    getState("currentTime") as number,
  ];

  lastFrameProgress = lastFrameProgress || currentProgress;

  const timeJump: boolean = Math.abs(currentProgress - lastFrameProgress) > LIMIT_DELTA_TIME;
  const state: States = paused ? States.PAUSED : States.PLAYING;

  lastFrameProgress = currentProgress;
  return { state, currentProgress, timeJump };
}

function getSkipButtonState(currentProgress: number): skipButtonStates {
  if (beginIntro === null) return skipButtonStates.HIDDEN;

  const endConstantStateTime: number = Math.min(endIntro, beginIntro + 5);

  if (currentProgress >= beginIntro && currentProgress <= endConstantStateTime) {
    return skipButtonStates.CONSTANT;
  }

  if (currentProgress > endConstantStateTime && currentProgress <= endIntro) {
    return skipButtonStates.HOVER;
  }

  return skipButtonStates.HIDDEN;
}

function setSkipButtonState(currentProgress: number): void {
  let state: skipButtonStates = getSkipButtonState(currentProgress);

  if (state === currentSkipButtonState) return;

  currentSkipButtonState = state;

  if (state === skipButtonStates.CONSTANT) {
    skipButton.style.opacity = '1';
  } else {
    skipButton.style.opacity = '0';
  }

  if (state === skipButtonStates.HIDDEN) {
    skipButton.style.display = 'none';
  } else {
    skipButton.style.display = 'block';
  }
}

function createSkipButton(): void {
  const videoContainer: HTMLDivElement = document.getElementById("vilosRoot") as HTMLDivElement;

  if (videoContainer) {
    log("Creating skip button...");

    if (document.getElementById("skipButton") == null) {
      skipButton = document.createElement("button");

      skipButton.id = "skipButton";
      skipButton.innerText = "Skip Intro";

      skipButton.style.display = 'none';

      skipButton.onmouseout = (): void => {
        if (currentSkipButtonState === skipButtonStates.CONSTANT) {
          skipButton.style.opacity = '1';
        } else {
          skipButton.style.opacity = '0';
        }
      };

      skipButton.onmouseover = (): void => { skipButton.style.opacity = '1'; };

      skipButton.onclick = (): void => triggerAction(Actions.TIME_UPDATE, endIntro);

      videoContainer.appendChild(skipButton);
    }
  }
}

const handleLocalAction = (action: Actions) => (): void => {
  if (ignoreNext[action] === true) {
    ignoreNext[action] = false;
    return;
  }

  const { state, currentProgress, timeJump }: { state: States, currentProgress: number, timeJump: boolean } = getStates();
  const type: WebpageMessageTypes = WebpageMessageTypes.LOCAL_UPDATE;

  log('Local Action', action, { type, state, currentProgress });
  switch (action) {
    case Actions.PLAY:
    case Actions.PAUSE:
      chrome.runtime.sendMessage({ type, state, currentProgress });
      break;
    case Actions.TIME_UPDATE:
      setSkipButtonState(currentProgress);
      timeJump && chrome.runtime.sendMessage({ type, state, currentProgress });
      break;
  }
}

function triggerAction(action: Actions, progress: number): void {
  ignoreNext[action] = true;

  switch (action) {
    case Actions.PAUSE:
      player.pause();
      player.currentTime = progress;
      break;
    case Actions.PLAY:
      player.play();
      break;
    case Actions.TIME_UPDATE:
      player.currentTime = progress;
      break;
    default:
      ignoreNext[action] = false;
  }
}

function sendRoomConnectionMessage(): void {
  const { state, currentProgress }: { state: States, currentProgress: number } = getStates();
  const type: WebpageMessageTypes = WebpageMessageTypes.ROOM_CONNECTION;
  chrome.runtime.sendMessage(
    { state, currentProgress, type }
  );
}

interface BackgroundMessage {
  type: BackgroundMessageTypes,
  marks: Marks
}

function handleRemoteUpdate({ roomState, roomProgress }: { roomState: States, roomProgress: number }): void {
  log('Handling Remote Update', { roomState, roomProgress });
  const { state, currentProgress }: { state: States, currentProgress: number } = getStates();
  if (state !== roomState) {
    if (roomState === States.PAUSED) triggerAction(Actions.PAUSE, roomProgress);
    if (roomState === States.PLAYING) triggerAction(Actions.PLAY, roomProgress);
  }

  if (Math.abs(roomProgress - currentProgress) > LIMIT_DELTA_TIME) {
    triggerAction(Actions.TIME_UPDATE, roomProgress);
  }
}

function handleBackgroundMessage(args) {
  log("Received message from Background", args);

  const { type }: BackgroundMessage = args;
  switch (type) {
    case BackgroundMessageTypes.ROOM_CONNECTION:
      sendRoomConnectionMessage();
      break;
    case BackgroundMessageTypes.REMOTE_UPDATE:
      handleRemoteUpdate(args);
      break;
    case BackgroundMessageTypes.SKIP_MARKS:
      const { marks: { begin, end } }: BackgroundMessage = args;
      beginIntro = begin;
      endIntro = end;
      break;
    default:
      throw "Invalid BackgroundMessageType: " + type;
  }
}

export function runContentScript(): void {
  player = document.getElementById("player0") as HTMLVideoElement;

  if (!player) {
    setTimeout(runContentScript, 500);
    return;
  }

  for (let action in Actions) {
    player.addEventListener(Actions[action], handleLocalAction(Actions[action]));
  }

  createSkipButton();

  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
  chrome.runtime.sendMessage({ type: WebpageMessageTypes.CONNECTION });
}

runContentScript();