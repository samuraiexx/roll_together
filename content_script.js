{
  const crunchyPartyScript = () => {
    let ignoreNext = {play: false, pause: false};

    const crunchyPartyExtension = chrome
      .runtime
      .connect('npadafhdpkboekbeaghejnjceedcjkkm', {name: 'crunchyParty'});

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

    async function onPlay() {
      if(ignoreNext.play) {
        ignoreNext.play = false;
      }

      crunchyPartyExtension.postMessage({ crunchyPartyAction: "play" });
      console.log("Play", await getStates());
    }

    async function onPause() {
      if(ignoreNext.pause) {
        ignoreNext.pause = false;
      }

      crunchyPartyExtension.postMessage({ crunchyPartyAction: "pause" });
      console.log("Pause", await getStates());
    }

    async function onReady() {
      console.log("Ready", await getStates());
    }

    async function onEnded() {
      console.log("Ended", await getStates());
    }

    async function onTimeUpdate() {
      console.log("Time Update", await getStates());
    }

    async function onReceivePlay() {
      const paused = await getState('getPaused');
      if (paused) {
        ignoreNext.play = true;
        VILOS_PLAYERJS.play();
      }
    }

    async function onReceivePause() {
      const paused = await getState('getPaused');
      if (!paused) {
        ignoreNext.pause = true;
        VILOS_PLAYERJS.pause();
      }
    }

    VILOS_PLAYERJS.on("play", onPlay);
    VILOS_PLAYERJS.on("pause", onPause);
    VILOS_PLAYERJS.on("ready", onReady);
    VILOS_PLAYERJS.on("ended", onEnded);
    VILOS_PLAYERJS.on("timeupdate", onTimeUpdate);

    crunchyPartyExtension.onMessage.addListener(
      function (request) {
        const action = request.crunchyPartyActionReceived;
        console.log(`Received ${action} from server`);

        switch (action) {
          case "play":
            onReceivePlay();
            break;
          case "pause":
            onReceivePause();
            break;
          default:
            break;
        }
      });
  };

  if (document.getElementById('CRUNCHY_PARTY_SCRIPT') == null) {
    var script = document.createElement("script");
    script.id = 'CRUNCHY_PARTY_SCRIPT';
    script.textContent = `code = ${crunchyPartyScript.toString()};\n code();`;
    (document.head).appendChild(script);
  }
}