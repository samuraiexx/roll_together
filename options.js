let page = document.getElementById('buttonDiv');

let googleGreen = "#009688";
let googleAquaBlue = "#00BBD3";
let crunchyrollOrange = "#F78C25";

const colorOptions = [ googleGreen, googleAquaBlue, crunchyrollOrange ];

let submitButton = document.getElementById("submitButton");

submitButton.onclick = function() {
  let confirmationMessage;
  let color = document.getElementById("colorInput").value;
  let isOk = /^#[0-9A-F]{6}$/i.test(color);

  if(isOk) {
    confirmationMessage = "Sucessfuly changed!";
    log("Color changed to " + color);
    setExtensionColor(color);
  } else {
    confirmationMessage = "Invalid hex code!";
    log("Invalid input");
  }

  document.getElementById("confirmationMessage").innerHTML = confirmationMessage;
}

chrome.storage.sync.get('extensionColor', function (data) {
  document.getElementById("colorInput").value = data.extensionColor;
});

function setExtensionColor(color) {
  chrome.storage.sync.set({ extensionColor: color }, function () {
    log("Setting extension color to " + color);
  });
  document.getElementById("colorInput").value = color;
}

function buildButtons(colorOptions) {
  let page = document.getElementById("buttonDiv");

  for (let color of colorOptions) {
    let newButton = document.createElement("button");
    newButton.addEventListener("click", function () { setExtensionColor(color) });
    newButton.style.backgroundColor = color;
    newButton.className = "colorChangeButton"
    page.appendChild(newButton);
  }
}

buildButtons(colorOptions);
