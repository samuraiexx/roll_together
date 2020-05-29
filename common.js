const DEBUG = true;

const Actions = {
  PLAY: 'play',
  PAUSE: 'pause',
  READY: 'ready',
  ENDED: 'ended',
  TIMEUPDATE: 'timeupdate',
}

function log() {
  return DEBUG && console.log(...arguments);
} 