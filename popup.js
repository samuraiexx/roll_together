const actionButton = document.getElementById('crunchy-party');
const background = chrome.extension.getBackgroundPage();
const roomIdContainer = document.getElementById('room-id-container');

function getParameterByName(url, name) {
  const queryString = /\?[^#]+(?=#|$)|$/.exec(url)[0];
  const regex = new RegExp("(?:[?&]|^)" + name + "=([^&#]*)");
  const results = regex.exec(queryString);

  console.log({url, queryString, name, results});
  if(!results || results.length < 2) {
    return null;
  }

  return decodeURIComponent(results[1].replace(/\+/g, " "));
}

function update() {
  const roomId = background.roomId;
  if(roomId) {
    roomIdContainer.innerHTML = roomId;
    try {
      navigator.clipboard.writeText(roomId);
    } catch (ex) {
      // Do nothing, it just wont copy the text
    }
  }
}
update();


actionButton.onclick = function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    tab = tabs[0];

    chrome.tabs.executeScript(
      tab.id,
      { file: 'content_script.js' },
      () => {
        const roomId = getParameterByName(tab.url, 'crunchyPartyRoom');
        background.connectWebsocket(roomId, update);
      }
    );

  });
};