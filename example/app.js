const NOAuth = require('../');

const {BrowserWindow, ipcMain, app} = require('electron');
const path = require('path');
const url = require('url');

let ApplicationWindow;

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit(); // OSX
	}
});

ipcMain.on('open_login_form', () => {
	app.NOAuth();
});

ipcMain.on('get_nintendo_user_basic_data', async (event, nintendo_user_session) => {
	event.sender.send('nintendo_user_basic_data', await NOAuth.getBasicUserData(nintendo_user_session));
});

ipcMain.on('get_nintendo_user_friend_list', async (event, nintendo_user_session) => {
	const friend_list = await NOAuth.getFriendList(nintendo_user_session);
	console.log(await NOAuth.getOtherUserInfo(nintendo_user_session));
	event.sender.send('nintendo_user_friend_list', friend_list);
});

app.on('nintendo_user_session', nintendo_user_session => {
	//ApplicationWindow.webContents.openDevTools();
	ApplicationWindow.webContents.send('nintendo_user_session', nintendo_user_session);
});

app.on('ready', () => {
	NOAuth.wrapApp(app);

	ApplicationWindow = new BrowserWindow();

	ApplicationWindow.setMenu(null);
	ApplicationWindow.maximize();

	ApplicationWindow.webContents.on('did-finish-load', () => {
		ApplicationWindow.show();
		ApplicationWindow.focus();
	});
		
	ApplicationWindow.loadURL(url.format({
		pathname: path.join(__dirname, '/app/index.html'),
		protocol: 'file:',
		slashes: true
	}));

	ApplicationWindow.on('closed', () => {
		ApplicationWindow = null;
	});
});