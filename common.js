const DEBUG = true;
const DISPLAY_DEBUG_TIME = false;
const LIMIT_DELTA_TIME = 3; // In Seconds

const Actions = {
  PLAY: 'play',
  PAUSE: 'pause',
  READY: 'ready',
  ENDED: 'ended',
  TIMEUPDATE: 'timeupdate',
}

const States = {
  PLAYING: 'playing',
  PAUSED: 'paused'
}

function log() {
  const args = DISPLAY_DEBUG_TIME ? [(new Date()).toJSON()] : [];
  args.push(...arguments);
  return DEBUG && console.log(...args);
} 