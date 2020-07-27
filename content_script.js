if (document.getElementById('ROLL_TOGETHER_SCRIPT') == null) {
  rollTogetherScript = () => {
    const ignoreNext = {};
    let lastFrameProgress = null;
    
    let beginIntro = null;
    let endIntro = null;

    let skipButton = null;
    let currentSkipButtonState = null;

    const skipButtonStates = {
      CONSTANT: 'constant', 
      HOVER: 'hover', 
      HIDDEN: 'hidden'
    };

    const rollTogetherExtension = chrome
      .runtime
      .connect('ihablaljfnaebapdcgnomolaijpmhkff', { name: 'rollTogether' });

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

   const getSkipButtonState = (currentProgress) => {
      if(!beginIntro) return skipButtonStates.HIDDEN;

      let endConstantStateTime = Math.min(endIntro, beginIntro + 5);

      if(currentProgress >= beginIntro && currentProgress <= endConstantStateTime) {
        return skipButtonStates.CONSTANT;
      }

      if(currentProgress > endConstantStateTime && currentProgress <= endIntro) {
        return skipButtonStates.HOVER;
      }

      return skipButtonStates.HIDDEN;
    }

    const setSkipButtonState = (currentProgress) => {
      let state = getSkipButtonState(currentProgress);

      if(state === currentSkipButtonState) return;

      currentSkipButtonState = state;

      if(state === skipButtonStates.CONSTANT) {
        skipButton.style.opacity = 1;
      } else {
        skipButton.style.opacity = 0;
      }

      if(state === skipButtonStates.HIDDEN) {
        skipButton.style.display = 'none';
      } else {
        skipButton.style.display = 'block';
      }
    }

    const createSkipButton = () => {
      const root = document.getElementById("showmedia_video_player");
  
      if(root) {
        console.log("Creating skip button...");
  
        if(document.getElementById("skipButton") == null) {
          skipButton = document.createElement("button");

          skipButton.id = "skipButton";
          skipButton.innerText = "Skip Intro";

          skipButton.onmouseout = () => {
            if(currentSkipButtonState === skipButtonStates.CONSTANT) {
              skipButton.style.opacity = 1;
            } else {
              skipButton.style.opacity = 0;
            }
          };

          skipButton.onmouseover = () => skipButton.style.opacity = 1;

          skipButton.onclick = () => triggerAction(Actions.TIMEUPDATE, endIntro);          

          root.appendChild(skipButton);
          setSkipButtonState();
        }
      }
    }
  
    createSkipButton();

    const handleLocalAction = action => async () => {
      if (ignoreNext[action] === true) {
        ignoreNext[action] = false;
        return;
      }

      const { state, currentProgress, timeJump } = await getStates();
      const type = WebpageMessageTypes.LOCAL_UPDATE;

      log('Local Action', action, { type, state, currentProgress });
      switch (action) {
        case Actions.PLAY:
        case Actions.PAUSE:
          rollTogetherExtension.postMessage({ type, state, currentProgress });
          break;
        case Actions.TIMEUPDATE:
          setSkipButtonState(currentProgress);
          timeJump && rollTogetherExtension.postMessage({ type, state, currentProgress });
          break;
      }
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

    const sendConnectionMessage = async () => {
      const { state, currentProgress } = await getStates();
      const urlRoomId = getParameterByName(window.location.href);
      const type = WebpageMessageTypes.CONNECTION;
      rollTogetherExtension.postMessage(
        { state, currentProgress, urlRoomId, type }
      );
    }

    async function handleRemoteUpdate({ roomState, roomProgress }) {
      log('Handling Remote Update', { roomState, roomProgress });
      const { state, currentProgress } = await getStates();
      if (state !== roomState) {
        if (roomState === States.PAUSED) triggerAction(Actions.PAUSE, roomProgress);
        if (roomState === States.PLAYING) triggerAction(Actions.PLAY, roomProgress);
      }

      if (Math.abs(roomProgress - currentProgress) > LIMIT_DELTA_TIME) {
        triggerAction(Actions.TIMEUPDATE, roomProgress);
      }
    }

    const handleBackgroundMessage = async (args) => {
      const { type } = args;
      switch (type) {
        case BackgroundMessageTypes.CONNECTION:
          sendConnectionMessage();
          break;
        case BackgroundMessageTypes.REMOTE_UPDATE:
          handleRemoteUpdate(args);
          break;
        case BackgroundMessageTypes.SKIP_MARKS:
          const { marks } = args;
          const { begin, end } = marks;
          beginIntro = begin;
          endIntro = end;
          break;
        default:
          throw "Invalid BackgroundMessageType: " + type;
      }
    }

    Object.values(Actions).forEach(
      action => VILOS_PLAYERJS.on(action, handleLocalAction(action))
    );

    rollTogetherExtension.onMessage.addListener(handleBackgroundMessage);
  };

  var commonScript = document.createElement("script");
  commonScript.textContent = commonCode;

  var script = document.createElement("script");
  script.id = 'ROLL_TOGETHER_SCRIPT';
  script.textContent = `code = ${rollTogetherScript.toString()};\n code();`;

  (document.head).appendChild(commonScript);
  (document.head).appendChild(script);
}