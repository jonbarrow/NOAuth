/* eslint-env browser */

const ipcRenderer = require('electron').ipcRenderer;

function addEvent(object, event, func) {
	object.addEventListener(event, func, true);
}

addEvent(document.querySelector('button'), 'click', () => {
	ipcRenderer.send('open_login_form');
});

ipcRenderer.on('nintendo_user_session', (event, nintendo_user_session) => {
	ipcRenderer.send('get_nintendo_user_basic_data', nintendo_user_session);
	ipcRenderer.send('get_nintendo_user_friend_list', nintendo_user_session);
});

ipcRenderer.on('nintendo_user_friend_list', (event, nintendo_user_friend_list) => {
	for (const friend of nintendo_user_friend_list.result.slice(1)) {
		const item = document.getElementById('TEMPLATE_FRIEND_ICON').content.firstElementChild.cloneNode(true);

		item.querySelector('img').src = friend.imageUri;
		item.querySelector('p').innerHTML = friend.name;
		document.querySelector('.friend-icon-list').appendChild(item);
	}
});

ipcRenderer.on('nintendo_user_basic_data', (event, nintendo_user_basic_data) => {
	document.querySelector('.login').classList.add('hidden');
	const mii = nintendo_user_basic_data.mii;
	const item = document.getElementById('TEMPLATE_MII').content.firstElementChild.cloneNode(true);
		
	document.querySelector('.welcome').innerHTML = `Welcome, ${nintendo_user_basic_data.nickname}!`;
	if (mii) {
		item.querySelector('img').src = `https://${mii.imageOrigin}/2.0.0/miis/${mii.id}/image/${mii.etag}.png?type=face&width=128`;
		item.querySelector('img').classList.add(mii.favoriteColor);
	} else {
		item.querySelector('img').src = './images/mii_default.png';
	}
	document.querySelector('.logged-in .head').appendChild(item);

	for (const mii of nintendo_user_basic_data.candidateMiis) {
		const item = document.getElementById('TEMPLATE_MII').content.firstElementChild.cloneNode(true);

		item.querySelector('img').src = `https://${mii.imageOrigin}/2.0.0/miis/${mii.id}/image/${mii.etag}.png?type=face&width=128`;
		item.querySelector('img').classList.add(mii.favoriteColor);
		document.querySelector('.mii-list').appendChild(item);
	}
	document.querySelector('.logged-in').classList.remove('hidden');
});
  