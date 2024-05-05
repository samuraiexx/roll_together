import _, { get } from "lodash";
import { Radius, StorageData } from "./types";

declare const process: any;

const DEBUG: boolean = process.env.NODE_ENV === "development";
const DISPLAY_DEBUG_TIME: boolean = false;
const googleGreen: string = "#009688";
const googleAquaBlue: string = "#00BBD3";

export const crunchyrollOrange: string = "#F78C25";

export const LIMIT_DELTA_TIME: number = 3; // In Seconds
const defaultColorOptions: string[] = [
  googleGreen,
  googleAquaBlue,
  crunchyrollOrange,
];

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
      { colorOptions: defaultColorOptions },
      function (data: StorageData) {
        resolve(data.colorOptions as string[]);
      }
    );
  });
}

/**
 * Gets typed keys of an enum. Useful for iterating over an enum.
 * @param obj The enum definition to get keys for.
 * @returns Array of keys for accessing the enum.
 */
export function getEnumKeys<O extends object, K extends keyof O = keyof O>(
  obj: O
): K[] {
  // This works because of how enums are defined at runtime.
  // For string enums, the Object.keys component covers it as the runtime object only includes key to value mappings.
  // For number enums, we filter out numeric keys as TypeScript maps both the values to keys and keys to values.
  // For heterogeneous enums, both of the above rules apply.
  return Object.keys(obj).filter((k) => Number.isNaN(+k)) as K[];
}

export async function setIconColor(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  color: string | undefined = undefined
) {
  if (color == undefined) {
    color = await getExtensionColor();
  }

  ctx.font = "bold 92px roboto";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 20, true, false);
  ctx.fillStyle = "white";
  ctx.fillText("RT", canvas.width / 2, canvas.height / 2 + 32);

  const imageData = ctx.getImageData(0, 0, 128, 128);
  chrome.action.setIcon({
    imageData,
  });

  log("Set Icon Color", { color });
}

export function roundRect(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | Radius | undefined,
  fill: boolean,
  stroke: boolean | undefined
): void {
  if (typeof stroke === "undefined") {
    stroke = true;
  }
  if (typeof radius === "undefined") {
    radius = 5;
  }
  if (typeof radius === "number") {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    const defaultRadius: Radius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (let prop in defaultRadius) {
      const side = prop as keyof Radius;
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius.br,
    y + height
  );
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}
