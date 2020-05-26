const actionButton = document.getElementById('crunchyParty');

chrome.runtime.onInstalled.addListener(function () {
  async function getState(stateName) {
    const func = VILOS_PLAYERJS[stateName].bind(VILOS_PLAYERJS);
    return await new Promise(func);
  }

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
});

if(actionButton) {
  actionButton.onclick = () => {
    VILOS_PLAYERJS.on("play", onTogglePlay);
    VILOS_PLAYERJS.on("pause", onTogglePlay);
    VILOS_PLAYERJS.on("ready", onReady);
    VILOS_PLAYERJS.on("ended", onEnded);
    VILOS_PLAYERJS.on("timeupdate", onTimeUpdate);
    VILOS_PLAYERJS.on("progress", onProgress);
    VILOS_PLAYERJS.on("setCurrentTime", onProgress);
  };
}