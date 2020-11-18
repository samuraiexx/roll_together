import { 
  LIMIT_DELTA_TIME,
  States,
  log,
  Actions,
  WebpageMessageTypes,
  BackgroundMessageTypes
} from "./common.js";

const ignoreNext = {};

let player = null;
let lastFrameProgress = null;

let beginIntro = null;
let endIntro = null;
let skipButton = null;
let currentSkipButtonState = null;

const skipButtonStates = {
  CONSTANT: 'constant',
  HOVER: 'hover',
  HIDDEN: 'hidden'
};

function getState(stateName) {
  return player[stateName];
}

function getStates() {
  const [paused, currentProgress] = [
    getState("paused"),
    getState("currentTime"),
  ];

  lastFrameProgress = lastFrameProgress || currentProgress;

  const timeJump = Math.abs(currentProgress - lastFrameProgress) > LIMIT_DELTA_TIME;
  const state = paused ? States.PAUSED : States.PLAYING;

  lastFrameProgress = currentProgress;
  return { state, currentProgress, timeJump };
}

function getSkipButtonState(currentProgress) {
  if (beginIntro === null) return skipButtonStates.HIDDEN;

  const endConstantStateTime = Math.min(endIntro, beginIntro + 5);

  if (currentProgress >= beginIntro && currentProgress <= endConstantStateTime) {
    return skipButtonStates.CONSTANT;
  }

  if (currentProgress > endConstantStateTime && currentProgress <= endIntro) {
    return skipButtonStates.HOVER;
  }

  return skipButtonStates.HIDDEN;
}

function setSkipButtonState(currentProgress) {
  let state = getSkipButtonState(currentProgress);

  if (state === currentSkipButtonState) return;

  currentSkipButtonState = state;

  if (state === skipButtonStates.CONSTANT) {
    skipButton.style.opacity = 1;
  } else {
    skipButton.style.opacity = 0;
  }

  if (state === skipButtonStates.HIDDEN) {
    skipButton.style.display = 'none';
  } else {
    skipButton.style.display = 'block';
  }
}

function createSkipButton() {
  const videoContainer = document.getElementById("vilosRoot");

  if (videoContainer) {
    log("Creating skip button...");

    if (document.getElementById("skipButton") == null) {
      skipButton = document.createElement("button");

      skipButton.id = "skipButton";
      skipButton.innerText = "Skip Intro";

      skipButton.style.display = 'none';

      skipButton.onmouseout = () => {
        if (currentSkipButtonState === skipButtonStates.CONSTANT) {
          skipButton.style.opacity = 1;
        } else {
          skipButton.style.opacity = 0;
        }
      };

      skipButton.onmouseover = () => skipButton.style.opacity = 1;

      skipButton.onclick = () => triggerAction(Actions.TIMEUPDATE, endIntro);

      videoContainer.appendChild(skipButton);
    }
  }
}

const handleLocalAction = action => () => {
  if (ignoreNext[action] === true) {
    ignoreNext[action] = false;
    return;
  }

  const { state, currentProgress, timeJump } = getStates();
  const type = WebpageMessageTypes.LOCAL_UPDATE;

  log('Local Action', action, { type, state, currentProgress });
  switch (action) {
    case Actions.PLAY:
    case Actions.PAUSE:
      chrome.runtime.sendMessage({ type, state, currentProgress });
      break;
    case Actions.TIMEUPDATE:
      setSkipButtonState(currentProgress);
      timeJump && chrome.runtime.sendMessage({ type, state, currentProgress });
      break;
  }
}

function triggerAction(action, progress) {
  ignoreNext[action] = true;

  switch (action) {
    case Actions.PAUSE:
      player.pause();
      player.currentTime = progress;
      break;
    case Actions.PLAY:
      player.play();
      break;
    case Actions.TIMEUPDATE:
      player.currentTime = progress;
      break;
    default:
      ignoreNext[action] = false;
  }
}

function sendRoomConnectionMessage() {
  const { state, currentProgress } = getStates();
  const type = WebpageMessageTypes.ROOM_CONNECTION;
  chrome.runtime.sendMessage(
    { state, currentProgress, type }
  );
}

function handleRemoteUpdate({ roomState, roomProgress }) {
  log('Handling Remote Update', { roomState, roomProgress });
  const { state, currentProgress } = getStates();
  if (state !== roomState) {
    if (roomState === States.PAUSED) triggerAction(Actions.PAUSE, roomProgress);
    if (roomState === States.PLAYING) triggerAction(Actions.PLAY, roomProgress);
  }

  if (Math.abs(roomProgress - currentProgress) > LIMIT_DELTA_TIME) {
    triggerAction(Actions.TIMEUPDATE, roomProgress);
  }
}

function handleBackgroundMessage(args) {
  log("Received message from Background", args);

  const { type } = args;
  switch (type) {
    case BackgroundMessageTypes.ROOM_CONNECTION:
      sendRoomConnectionMessage();
      break;
    case BackgroundMessageTypes.REMOTE_UPDATE:
      handleRemoteUpdate(args);
      break;
    case BackgroundMessageTypes.SKIP_MARKS:
      const { marks: { begin, end } } = args;
      beginIntro = begin;
      endIntro = end;
      break;
    default:
      throw "Invalid BackgroundMessageType: " + type;
  }
}

export function runContentScript() {
  player = document.getElementById("player0");

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