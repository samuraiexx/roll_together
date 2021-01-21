import _ from "lodash";

const DEBUG: boolean = "dev" === "dev";
const DISPLAY_DEBUG_TIME: boolean = false;

export const LIMIT_DELTA_TIME: number = 3; // In Seconds
const googleGreen: string = "#009688";
const googleAquaBlue: string = "#00BBD3";
export const crunchyrollOrange: string = "#F78C25";
export const chineseSilver: string = "#CCC";
const defaultcolorOptions: string[] = [
  googleGreen,
  googleAquaBlue,
  crunchyrollOrange,
];

export enum Actions {
  PLAY = "play",
  PAUSE = "pause",
  READY = "ready",
  ENDED = "ended",
  TIME_UPDATE = "timeupdate",
}

export enum States {
  PLAYING = "playing",
  PAUSED = "paused",
}

export enum BackgroundMessageTypes {
  REMOTE_UPDATE = "remote_update",
  ROOM_CONNECTION = "room_connection",
  SKIP_MARKS = "skip_marks",
}

export enum WebpageMessageTypes {
  LOCAL_UPDATE = "local_update",
  ROOM_CONNECTION = "room_connection",
  CONNECTION = "connection",
}

export function log(...args: any): void {
  const date: Array<any> = DISPLAY_DEBUG_TIME ? [new Date().toJSON()] : [];
  DEBUG && console.log(...date, ...args);
  return;
}

export function getParameterByName(
  url: string,
  name: string = "rollTogetherRoom"
): string | null {
  const queryString: string = /\?[^#]+(?=#|$)|$/.exec(url)![0];
  const regex: RegExp = new RegExp("(?:[?&]|^)" + name + "=([^&#]*)");
  const results: RegExpExecArray | null = regex.exec(queryString);

  if (_.isNull(results) || results.length < 2) {
    return null;
  }

  return decodeURIComponent(results[1].replace(/\+/g, " "));
}

export function updateQueryStringParameter(
  uri: string,
  key: string,
  value: string
): string {
  const re: RegExp = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
  const separator: string = uri.indexOf("?") !== -1 ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, "$1" + key + "=" + value + "$2");
  } else {
    return uri + separator + key + "=" + value;
  }
}

interface StorageData {
  extensionColor?: string;
  colorOptions?: string[];
  isIntroFeatureActive?: boolean;
}

export function getExtensionColor(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { extensionColor: crunchyrollOrange },
      function (data: StorageData) {
        resolve(data.extensionColor as string);
      }
    );
  });
}

export function getColorMenu(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { colorOptions: defaultcolorOptions },
      function (data: StorageData) {
        resolve(data.colorOptions as string[]);
      }
    );
  });
}

export function getIntroFeatureState(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { isIntroFeatureActive: false },
      function (data: StorageData) {
        resolve(data.isIntroFeatureActive as boolean);
      }
    );
  });
}
