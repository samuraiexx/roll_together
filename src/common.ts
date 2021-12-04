import _ from "lodash";

const DEBUG: boolean = process.env.NODE_ENV === "development";
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

export type PlayerStateProp = 
  "controls" |
  "currentTime" |
  "defaultMuted" |
  "defaultPlaybackRate" |
  "duration" |
  "ended" |
  "loop" |
  "muted" | 
  "paused" | 
  "playbackRate" |
  "volume";

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

export interface Marks {
  animeName: string;
  begin: number;
  end: number;
  episode: number;
  id: number;
}

export type BackgroundMessage = RemoteUpdateBackgroundMessage | RoomConnectionBackgroundMessage | SkipMarksBackgroundMessage;

interface BackgroundMessageBase {
  type: BackgroundMessageTypes,
}

export interface RemoteUpdateBackgroundMessage extends BackgroundMessageBase {
  type: BackgroundMessageTypes.REMOTE_UPDATE,
  roomState: States,
  roomProgress: number,
}

export interface RoomConnectionBackgroundMessage extends BackgroundMessageBase {
  type: BackgroundMessageTypes.ROOM_CONNECTION,
}

export interface SkipMarksBackgroundMessage extends BackgroundMessageBase {
  type: BackgroundMessageTypes.SKIP_MARKS,
  marks: Marks,
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

/**
 * Gets typed keys of an enum. Useful for iterating over an enum.
 * @param obj The enum definition to get keys for.
 * @returns Array of keys for accessing the enum.
 */
export function getEnumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
  // This works because of how enums are defined at runtime.
  // For string enums, the Object.keys component covers it as the runtime object only includes key to value mappings.
  // For number enums, we filter out numeric keys as TypeScript maps both the values to keys and keys to values.
  // For heterogeneous enums, both of the above rules apply.
  return Object.keys(obj).filter(k => Number.isNaN(+k)) as K[];
}

export function getBackgroundWindow() {
  return chrome.extension.getBackgroundPage()?.window as BackgroundWindow;
}

type GlobalWindow = Window & typeof globalThis;
export type BackgroundWindow = GlobalWindow & BackgroundWindowOverrides;
interface BackgroundWindowOverrides  {
  RollTogetherBackground: RollTogetherBackground;
  RollTogetherPopup: RollTogetherPopup;
}
export interface RollTogetherBackground {
  getRoomId: (tabId: number) => string | undefined;
  createRoom: (tab: chrome.tabs.Tab) => void;
  disconnectRoom: (tabId: number) => void;
}

export interface RollTogetherPopup {
  update?: () => void;
}