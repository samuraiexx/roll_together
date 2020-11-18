const DEBUG = true;
const DISPLAY_DEBUG_TIME = false;

export const LIMIT_DELTA_TIME = 3; // In Seconds
const googleGreen = "#009688";
const googleAquaBlue = "#00BBD3";
export const crunchyrollOrange = "#F78C25";
export const chineseSilver = "#CCC";
export const defaultcolorOptions = [googleGreen, googleAquaBlue, crunchyrollOrange];

export const Actions = {
  PLAY: 'play',
  PAUSE: 'pause',
  READY: 'ready',
  ENDED: 'ended',
  TIMEUPDATE: 'timeupdate',
}

export const States = {
  PLAYING: 'playing',
  PAUSED: 'paused',
}

export const BackgroundMessageTypes = {
  REMOTE_UPDATE: 'remote_update',
  ROOM_CONNECTION: 'room_connection',
  SKIP_MARKS: 'skip_marks'
}

export const WebpageMessageTypes = {
  LOCAL_UPDATE: 'local_update',
  ROOM_CONNECTION: 'room_connection',
  CONNECTION: 'connection',
}

type logMessage = string | string[] | object | object[];

export function log(...logMessage: logMessage[]): void {
  const debugTime = DISPLAY_DEBUG_TIME ? [(new Date()).toJSON()] : [];
  
  if (DEBUG) {
    console.log(debugTime);
    console.log(logMessage);
  }
}

export function getParameterByName(url, name = 'rollTogetherRoom') {
  const queryString = /\?[^#]+(?=#|$)|$/.exec(url)[0];
  const regex = new RegExp("(?:[?&]|^)" + name + "=([^&#]*)");
  const results = regex.exec(queryString);

  if (!results || results.length < 2) {
    return null;
  }

  return decodeURIComponent(results[1].replace(/\+/g, " "));
}

export function updateQueryStringParameter(uri, key, value) {
  var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
  var separator = uri.indexOf('?') !== -1 ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, '$1' + key + "=" + value + '$2');
  }
  else {
    return uri + separator + key + "=" + value;
  }
}

export function getExtensionColor() {
  return new Promise(callback => {
    chrome.storage.sync.get({ extensionColor: crunchyrollOrange }, function (data) {
      callback(data.extensionColor);
    });
  });
}

export function getColorMenu() {
  return new Promise(callback => {
    chrome.storage.sync.get({ colorOptions: defaultcolorOptions }, function (data) {
      callback(data.colorOptions);
    });
  });
}

export function getIntroFeatureState() {
  return new Promise(callback => {
    chrome.storage.sync.get({ isIntroFeatureActive: false }, function (data) {
      callback(data.isIntroFeatureActive);
    });
  });
}