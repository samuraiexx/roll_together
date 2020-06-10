let page = document.getElementById('buttonDiv');

let googleGreen = "#009688";
let googleAquaBlue = "#00BBD3";
let crunchyrollOrange = "#F78C25";

const colorOptions = [ googleGreen, googleAquaBlue, crunchyrollOrange ];

function buildButtons(colorOptions) {
  let page = document.getElementById("buttonDiv");

  for(let color of colorOptions) {
    let newButton = document.createElement("button");
    newButton.addEventListener("click", function() { 
      chrome.storage.sync.set({extensionColor: color}, function() {
        console.log("Setting extension color to " + color);
      })
    });
    newButton.style.backgroundColor = color;
    newButton.className = "colorChangeButton"
    page.appendChild(newButton);
  }
}

function setColor() {
  console.log("function called");
  let color = localStorage.getItem("color");

  let optionsButtons = document.querySelectorAll("button");
  console.log(optionsButtons);
  for(button of optionsButtons) button.style.backgroundColor = color;
}

buildButtons(colorOptions);
