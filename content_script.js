if (document.getElementById('CRUNCHY_PARTY_SCRIPT') == null) {
  crunchyPartyScript = () => {
    const ignoreNext = {};

    const crunchyPartyExtension = chrome
      .runtime
      .connect('ihablaljfnaebapdcgnomolaijpmhkff', { name: 'crunchyParty' });

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

    const handleLocalAction = action => async () => {
      if (ignoreNext[action] === true) {
        ignoreNext[action] = false;
        return;
      }

      log(action, await getStates());
      switch (action) {
        case Actions.PLAY:
        case Actions.PAUSE:
          crunchyPartyExtension.postMessage({ localAction: action });
          break;
      }
    }

    const handleRemoteAction = action => {
      console.log({action});
      ignoreNext[action] = true;

      switch (action) {
        case Actions.PAUSE:
          VILOS_PLAYERJS.pause();
          break;
        case Actions.PLAY:
          VILOS_PLAYERJS.play();
          break;
        default:
          ignoreNext[action] = false;
      }
    }

    Object.values(Actions).forEach(
      action => VILOS_PLAYERJS.on(action, handleLocalAction(action))
    );

    crunchyPartyExtension.onMessage.addListener(
      function (request) {
        const action = request.remoteAction;
        log(`Received ${action} from server`);
        handleRemoteAction(action);
      }
    );
  };

  var commonScript = document.createElement("script");
  commonScript.textContent = commonCode;

  var script = document.createElement("script");
  script.id = 'CRUNCHY_PARTY_SCRIPT';
  script.textContent = `code = ${crunchyPartyScript.toString()};\n code();`;

  (document.head).appendChild(commonScript);
  (document.head).appendChild(script);
}