let page = document.getElementById('colorSelector');

let googleGreen = "#009688";
let googleAquaBlue = "#00BBD3";
let crunchyrollOrange = "#F78C25";

const input = document.getElementById("colorInput");

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

chrome.storage.sync.get({'extensionColor': crunchyrollOrange}, function (data) {
  input.value = data.extensionColor;
});

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
    newButton.addEventListener("click", function () { setExtensionColor(color); });
    newButton.style.backgroundColor = color;
    newButton.className = "colorChangeButton"
    page.appendChild(newButton);
  }
}

buildButtons(colorOptions);
