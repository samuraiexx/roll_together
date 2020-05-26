const actionButton = document.getElementById('crunchyParty');

const code = `
console.log(window);
console.log(VILOS_PLAYERJS);
async function getStates() {
  const [paused, duration, currentTime] = await Promise.all([
    getState("getPaused"),
    getState("getDuration"),
    getState("getCurrentTime"),
  ]);

  return { paused, duration, currentTime };
}

async function onTogglePlay() {
  console.log("Toggle Play", await getStates());
}

async function onReady() {
  console.log("Ready", await getStates());
}

async function onEnded() {
  console.log("Ended", await getStates());
}

async function onTimeUpdate() {
  console.log("Time Update");
}

async function onProgress() {
  console.log("Progress", await getStates());
}

VILOS_PLAYERJS.on("play", onTogglePlay);
VILOS_PLAYERJS.on("pause", onTogglePlay);
VILOS_PLAYERJS.on("ready", onReady);
VILOS_PLAYERJS.on("ended", onEnded);
VILOS_PLAYERJS.on("timeupdate", onTimeUpdate);
VILOS_PLAYERJS.on("progress", onProgress);
VILOS_PLAYERJS.on("setCurrentTime", onProgress);
`;

actionButton.onclick = function () {
  var script = document.createElement("script");
  script.textContent = code;
  (document.head).appendChild(script);
  /*
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.executeScript(
        tabs[0].id,
        { code: code });
    });
    */
};