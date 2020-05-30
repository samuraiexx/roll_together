if (document.getElementById('CRUNCHY_PARTY_SCRIPT') == null) {
  crunchyPartyScript = () => {
    const ignoreNext = {};
    let lastFrameProgress = null;

    const crunchyPartyExtension = chrome
      .runtime
      .connect('ihablaljfnaebapdcgnomolaijpmhkff', { name: 'crunchyParty' });

    async function getState(stateName) {
      const func = VILOS_PLAYERJS[stateName].bind(VILOS_PLAYERJS);
      return await new Promise(func);
    }

    async function getStates() {
      const [paused, currentProgress] = await Promise.all([
        getState("getPaused"),
        getState("getCurrentTime"),
        // getState("getDuration"),
      ]);

      lastFrameProgress = lastFrameProgress || currentProgress;

      const timeJump = Math.abs(currentProgress - lastFrameProgress) > LIMIT_DELTA_TIME;
      const state = paused ? States.PAUSED : States.PLAYING;

      lastFrameProgress = currentProgress;
      return { state, currentProgress, timeJump };
    }

    const handleLocalAction = action => async () => {
      if (ignoreNext[action] === true) {
        ignoreNext[action] = false;
        return;
      }

      const { state, currentProgress, timeJump } = await getStates();

      log('Local Action', action, {state, currentProgress});
      switch (action) {
        case Actions.PLAY:
        case Actions.PAUSE:
          crunchyPartyExtension.postMessage({ state, currentProgress });
          break;
        case Actions.TIMEUPDATE:
           timeJump && crunchyPartyExtension.postMessage({ state, currentProgress });
          break;
      }
    }

    const sendInitialMessage = async () => {
      const { state, currentProgress } = await getStates();
      crunchyPartyExtension.postMessage({ state, currentProgress, initialMessage: true });
    }

    const triggerAction = (action, progress) => {
      ignoreNext[action] = true;

      switch (action) {
        case Actions.PAUSE:
          VILOS_PLAYERJS.pause();
          VILOS_PLAYERJS.setCurrentTime(progress);
          break;
        case Actions.PLAY:
          VILOS_PLAYERJS.play();
          break;
        case Actions.TIMEUPDATE:
          VILOS_PLAYERJS.setCurrentTime(progress);
          break;
        default:
          ignoreNext[action] = false;
      }
    }

    const handleRemoteUpdate = async ({roomState, roomProgress}) => {
      log('Handling Remote Update', {roomState, roomProgress});
      const { state, currentProgress } = await getStates();
      if(state !== roomState) {
        if(roomState === States.PAUSED) triggerAction(Actions.PAUSE, roomProgress);
        if(roomState === States.PLAYING) triggerAction(Actions.PLAY, roomProgress);
      }

      if(Math.abs(roomProgress - currentProgress) > LIMIT_DELTA_TIME) {
        triggerAction(Actions.TIMEUPDATE, roomProgress);
      } 
    }

    Object.values(Actions).forEach(
      action => VILOS_PLAYERJS.on(action, handleLocalAction(action))
    );

    crunchyPartyExtension.onMessage.addListener(handleRemoteUpdate);
    sendInitialMessage();
  };

  console.log({window, commonCode});
  var commonScript = document.createElement("script");
  commonScript.textContent = commonCode;

  var script = document.createElement("script");
  script.id = 'CRUNCHY_PARTY_SCRIPT';
  script.textContent = `code = ${crunchyPartyScript.toString()};\n code();`;

  (document.head).appendChild(commonScript);
  (document.head).appendChild(script);
}