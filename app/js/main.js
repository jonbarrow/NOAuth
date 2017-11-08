const ipcRenderer = require('electron').ipcRenderer;

function addEvent(object, event, func) {
    object.addEventListener(event, func, true);
}

addEvent(document.querySelector('button'), 'click', () => {
    ipcRenderer.send('open_login_form');
});