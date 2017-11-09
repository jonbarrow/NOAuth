const ipcRenderer = require('electron').ipcRenderer;

function addEvent(object, event, func) {
    object.addEventListener(event, func, true);
}

addEvent(document.querySelector('button'), 'click', () => {
    ipcRenderer.send('open_login_form');
});

ipcRenderer.on('user_data', (event, user_data) => {
    console.log(user_data);
    document.querySelector('.login').classList.add('hidden');
    let mii = user_data.mii;
    if (mii) {
        let item = document.getElementById('TEMPLATE_MII').content.firstElementChild.cloneNode(true);

        document.querySelector('.welcome').innerHTML = 'Welcome, ' + user_data.nickname + '!';
        item.querySelector('img').src = 'https://{}/2.0.0/miis/{}/image/{}.png?type=face&width=128'.format(
            mii.imageOrigin,
            mii.id,
            mii.etag
        );
        item.querySelector('img').classList.add(mii.favoriteColor);
        document.querySelector('.logged-in .head').appendChild(item);
    } else {

    }
    for (let mii of user_data.candidateMiis) {
        let item = document.getElementById('TEMPLATE_MII').content.firstElementChild.cloneNode(true);

        //item.classList.add('w-1/5');
        item.querySelector('p').innerHTML = mii.extended.name;
        item.querySelector('img').src = 'https://{}/2.0.0/miis/{}/image/{}.png?type=face&width=128'.format(
            mii.imageOrigin,
            mii.id,
            mii.etag
        );
        item.querySelector('img').classList.add(mii.favoriteColor);
        document.querySelector('.mii-list').appendChild(item);
    }
    document.querySelector('.logged-in').classList.remove('hidden');
});

String.prototype.format = function() {
    var i = 0, args = arguments;
    return this.replace(/{}/g, function () {
        return typeof args[i] != 'undefined' ? args[i++] : '';
    });
};
  