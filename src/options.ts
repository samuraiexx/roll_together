import _ from "lodash";

import {
  getExtensionColor,
  getColorMenu,
  log,
  crunchyrollOrange,
  setIconColor,
} from "./common";

const colorSelector: HTMLDivElement = document.getElementById(
  "colorSelector"
) as HTMLDivElement;
let addButton: HTMLButtonElement = document.getElementById(
  "addButton"
) as HTMLButtonElement;
let removeButton: HTMLButtonElement = document.getElementById(
  "removeButton"
) as HTMLButtonElement;
const input: HTMLInputElement = document.getElementById(
  "colorInput"
) as HTMLInputElement;
const confirmationMessage: HTMLParagraphElement = document.getElementById(
  "confirmationMessage"
) as HTMLParagraphElement;
const maxMenuSize: number = 10;
let extensionColor: string | undefined = undefined;

getExtensionColor().then((color: string): void => updateExtensionColor(color));
getColorMenu().then((colorOptions: string[]): void =>
  buildButtons(colorOptions)
);

function updateExtensionColor(color: string): void {
  extensionColor = color;
  input.value = color;
  addButton.style.backgroundColor = color;
  removeButton.style.backgroundColor = color;
}

function updateColorMenu(colorOptions: string[]): void {
  while (colorSelector.lastChild)
    colorSelector.removeChild(colorSelector.lastChild);
  buildButtons(colorOptions);
}

function colorCodeValidation(color: string): boolean {
  confirmationMessage.innerText = "";
  const isOk: boolean = /^#([0-9A-F]{3}){1,2}$/i.test(color);

  if (!isOk) {
    confirmationMessage.innerText = "Invalid hex code!";
    log("Invalid input");
    return false;
  }

  return true;
}

addButton.onclick = function (): void {
  const color: string = input.value.toUpperCase();

  getColorMenu().then((colorOptions: string[]): void => {
    if (colorOptions.length === maxMenuSize) {
      confirmationMessage.innerText = "You have reached the maximum menu size!";
      log("Max menu size reached");
      return;
    }

    if (!colorCodeValidation(color)) return;

    const isInMenu: boolean = colorOptions.includes(color);

    if (isInMenu) {
      confirmationMessage.innerText = "This color is already in the menu";
      log("Repeated color");
      return;
    }

    setExtensionColor(color);
    updateExtensionColor(color);

    colorOptions.push(color);

    setColorMenu(colorOptions);
    updateColorMenu(colorOptions);
  });
};

removeButton.onclick = function (): void {
  const color: string = input.value.toUpperCase();

  if (!colorCodeValidation(color)) return;

  if (color === crunchyrollOrange) {
    confirmationMessage.innerText = "You can't remove this color!";
    log("Tried to remove theme color");
    return;
  }

  getColorMenu().then((colorOptions: string[]): void => {
    const isInMenu: boolean = colorOptions.includes(color);

    if (!isInMenu) {
      confirmationMessage.innerText = "This color isn't in the menu";
      log("Color not in menu");
      return;
    }

    colorOptions = colorOptions.filter(function (element: string): boolean {
      return element != color;
    });

    getExtensionColor().then((currentColor: string): void => {
      const isInMenu: boolean = colorOptions.includes(currentColor);
      if (!isInMenu) {
        setExtensionColor(crunchyrollOrange);
        updateExtensionColor(crunchyrollOrange);
      }
    });

    setColorMenu(colorOptions);
    updateColorMenu(colorOptions);
  });
};

function setColorMenu(colorMenu: string[]): void {
  chrome.storage.sync.set({ colorOptions: colorMenu }, function (): void {
    log("Color menu updated");
  });
}

function setExtensionColor(color: string): void {
  chrome.storage.sync.set({ extensionColor: color }, function (): void {
    log("Setting extension color to " + color);
  });

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;

  const ctx = canvas.getContext("2d")!;
  setIconColor(canvas, ctx, color);
}

function buildButtons(colorOptions: string[]): void {
  for (let color of colorOptions) {
    let newButton: HTMLButtonElement = document.createElement("button");
    newButton.addEventListener("click", function (): void {
      setExtensionColor(color);
      updateExtensionColor(color);
    });
    newButton.style.backgroundColor = color;
    newButton.className = "colorChangeButton";
    colorSelector.appendChild(newButton);
  }
}
