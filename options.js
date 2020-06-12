let page = document.getElementById('colorSelector');

const input = document.getElementById("colorInput");
getExtensionColor().then(color => setExtensionColor(color));
getColorMenu().then(colorOptions => buildButtons(colorOptions));

let addButton = document.getElementById("addButton");
let removeButton = document.getElementById("removeButton");

addButton.onclick = function() {
  const color = document.getElementById("colorInput").value.toUpperCase();
  const isOk = /^#([0-9A-F]{3}){1,2}$/i.test(color);
  const confirmationMessage = document.getElementById("confirmationMessage");
  confirmationMessage.innerText = "";

  if (!isOk) {
    confirmationMessage.innerText = "Invalid hex code!";
    log("Invalid input");
    return;
  }

  getColorMenu().then( colorOptions => {
    const isInMenu = colorOptions.includes(color);

    if(isInMenu) {
      confirmationMessage.innerText = "This color is already in the menu";
      log("Repeated color");
      return;
    }

    setExtensionColor(color);
    colorOptions.push(color);

    setColorMenu(colorOptions);
    document.location.reload();

  }); 
}

removeButton.onclick = function() {
  const color = document.getElementById("colorInput").value.toUpperCase();
  const isOk = /^#([0-9A-F]{3}){1,2}$/i.test(color);
  const confirmationMessage = document.getElementById("confirmationMessage");
  confirmationMessage.innerText = "";

  if (!isOk) {
    confirmationMessage.innerText = "Invalid hex code!";
    log("Invalid input");
    return;
  }

  if(color === crunchyrollOrange) {
    confirmationMessage.innerText = "You can't remove this color!";
    log("Tried to remove theme color");
    return;
  }

  getColorMenu().then( colorOptions => {
    const isInMenu = colorOptions.includes(color);

    if(!isInMenu) {
      confirmationMessage.innerText = "This color isn't in the menu";
      log("Color not in menu");
      return;
    }

    colorOptions = colorOptions.filter(function(element) { return element != color; });

    getExtensionColor().then( currentColor => {
      const isInMenu = colorOptions.includes(currentColor);
      if(!isInMenu) setExtensionColor(crunchyrollOrange);
    });

    setColorMenu(colorOptions);
    document.location.reload();

  });
}

function setColorMenu(colorMenu) {
  chrome.storage.sync.set({ colorOptions: colorMenu }, function () {
    log("Removing " + color + " from the color menu");
  });
}

function setExtensionColor(color) {
  chrome.storage.sync.set({ extensionColor: color }, function () {
    log("Setting extension color to " + color);
  });

  input.value = color;
  addButton.style.backgroundColor = color;
  removeButton.style.backgroundColor = color;
}

input.addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    document.getElementById("").click();
  }
});

function buildButtons(colorOptions) {
  for (let color of colorOptions) {
    let newButton = document.createElement("button");
    newButton.addEventListener("click", function () { setExtensionColor(color); });
    newButton.style.backgroundColor = color;
    newButton.className = "colorChangeButton"
    page.appendChild(newButton);
  }
}