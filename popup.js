const actionButton = document.getElementById('crunchy-party');
const background = chrome.extension.getBackgroundPage();
const roomIdContainer = document.getElementById('room-id-container');

function executeScript(tabId, obj) {
  return new Promise(
    callback => chrome.tabs.executeScript(tabId, obj, callback)
  );
}

function update() {
  const roomId = background.roomId;
  if(roomId) {
    roomIdContainer.innerHTML = roomId;
    const clipBoard = navigator.clipboard;
    clipBoard && clipBoard.writeText(roomId).catch(error => {}); //Do nothing on Error
  }
}
background.window.updatePopup = update;
update();


actionButton.onclick = async function () {
  chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
    const roomId = getParameterByName(tabs[0].url);
    background.window.roomId = roomId;

    injectScript(tabs[0]);
  });
};