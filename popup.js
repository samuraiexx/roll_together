const actionButton = document.getElementById('crunchy-party');
const background = chrome.extension.getBackgroundPage();
const roomIdContainer = document.getElementById('room-id-container');

function executeScript(tabId, obj) {
  return new Promise(
    callback => chrome.tabs.executeScript(tabId, obj, callback)
  );
}

function getParameterByName(url, name) {
  const queryString = /\?[^#]+(?=#|$)|$/.exec(url)[0];
  const regex = new RegExp("(?:[?&]|^)" + name + "=([^&#]*)");
  const results = regex.exec(queryString);

  if(!results || results.length < 2) {
    return null;
  }

  return decodeURIComponent(results[1].replace(/\+/g, " "));
}

function update() {
  const roomId = background.roomId;
  if(roomId) {
    roomIdContainer.innerHTML = roomId;
    navigator.clipboard.writeText(roomId).catch(error => {}); //Do nothing on Error
  }
}
update();


actionButton.onclick = async function () {
  chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
    tab = tabs[0];

    const commonCodeResponse = await fetch('common.js');
    const commonCode = await commonCodeResponse.text();

    await executeScript(
      tab.id, 
      { code: `commonCode = \`${commonCode}\`;` }
    );
    await executeScript(tab.id, { file: 'content_script.js' });

    const roomId = getParameterByName(tab.url, 'crunchyPartyRoom');
    background.connectWebsocket(roomId, update);
  });
};