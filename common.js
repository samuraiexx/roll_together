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

function getParameterByName(url, name = 'crunchyPartyRoom') {
  const queryString = /\?[^#]+(?=#|$)|$/.exec(url)[0];
  const regex = new RegExp("(?:[?&]|^)" + name + "=([^&#]*)");
  const results = regex.exec(queryString);

  if(!results || results.length < 2) {
    return null;
  }

  return decodeURIComponent(results[1].replace(/\+/g, " "));
}

// Shared Script End

const injectScript = async (tab) => {
    const commonCodeResponse = await fetch('common.js');
    const commonCode = (await commonCodeResponse.text()).split('// Shared Script End')[0];

    await executeScript(
      tab.id, 
      { code: `commonCode = \`${commonCode}\`;` }
    );
    await executeScript(tab.id, { file: 'content_script.js' });
}