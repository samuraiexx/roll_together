let page = document.getElementById('colorSelector');

let googleGreen = "#009688";
let googleAquaBlue = "#00BBD3";
let crunchyrollOrange = "#F78C25";

const input = document.getElementById("colorInput");

const colorOptions = [ googleGreen, googleAquaBlue, crunchyrollOrange ];

let submitButton = document.getElementById("submitButton");

submitButton.onclick = function() {
  let confirmationMessage;
  let color = document.getElementById("colorInput").value;
  let isOk = /^#[0-9A-F]{6}$/i.test(color);

  if (!isOk) {
    confirmationMessage = "Invalid hex code!";
    document.getElementById("confirmationMessage").innerHTML = confirmationMessage;
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
    newButton.addEventListener("click", function () { input.value = color; });
    newButton.style.backgroundColor = color;
    newButton.className = "colorChangeButton"
    page.appendChild(newButton);
  }
}

buildButtons(colorOptions);
