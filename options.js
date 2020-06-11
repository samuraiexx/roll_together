let page = document.getElementById('colorSelector');

const googleGreen = "#009688";
const googleAquaBlue = "#00BBD3";

const input = document.getElementById("colorInput");
getExtensionColor().then(color => input.color = color);

const colorOptions = [ googleGreen, googleAquaBlue, crunchyrollOrange ];

let submitButton = document.getElementById("submitButton");

submitButton.onclick = function() {
  let color = document.getElementById("colorInput").value;
  let isOk = /^#[0-9A-F]{6}$/i.test(color);
  const confirmationMessage = document.getElementById("confirmationMessage");
  confirmationMessage.innerText = "";

  if (!isOk) {
    confirmationMessage.innerText = "Invalid hex code!";
    log("Invalid input");
    return;
  }

  setExtensionColor(color);
  log("Color changed to " + color);
}

function setExtensionColor(color) {
  chrome.storage.sync.set({ extensionColor: color }, function () {
    log("Setting extension color to " + color);
  });
  submitButton.style.backgroundColor = color;
}

input.addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    document.getElementById("").click();
  }
});

function buildButtons(colorOptions) {
  let page = document.getElementById("colorSelector");

  for (let color of colorOptions) {
    let newButton = document.createElement("button");
    newButton.addEventListener("click", function () { input.value = color; });
    newButton.style.backgroundColor = color;
    newButton.className = "colorChangeButton"
    page.appendChild(newButton);
  }
}

buildButtons(colorOptions);
