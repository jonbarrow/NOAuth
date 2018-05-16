const http = require('./http_helpers');
const {protocol, BrowserWindow} = require('electron');
const querystring = require('querystring');
const crypto = require('crypto');
   

let LoginWindow;
let GLOBAL_VERIFIER;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CLIENT_ID = '71b963c1b7b6d119';
const CONFIG = require('./config.json');

function generateLoginURL() {
	const payload = {
		client_id: CLIENT_ID,
		redirect_uri: `npf${CLIENT_ID}://auth`,
		response_type: 'session_token_code',
		scope: 'openid user user.birthday user.mii user.screenName',
		session_token_code_challenge: createChallenge(),
		session_token_code_challenge_method: 'S256',
		state: createState(50),
		theme: 'login_form'
	};

	return `${CONFIG.URLS.AUTHORIZE}?${querystring.stringify(payload)}`;
}

function createState(length) {
	let output = '';
	for (let i = 0; i < length; i++) {
		output += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
	}

	return output;
}

function createChallenge() {
	GLOBAL_VERIFIER = createState(50);
		
	const hash = crypto.createHash('sha256').update(GLOBAL_VERIFIER).digest();
	const _url = Buffer.from(hash).toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '')
		.replace(/=/g, '');
   
	return _url;
}

async function createDetailedUserSession(login_session) {
	const user_data = {
		login_session: login_session
	};
	const service_session = await getServiceSession(login_session);
	const user_info = await getUserInfo(service_session);
	const web_api_session = await getWebAPISession(service_session, user_info);

	user_data.service_session = service_session;
	user_data.web_api_session = web_api_session;

	return user_data;
}

async function getServiceSession(login_session) {
	const headers = CONFIG.HEADERS.SERVICE_TOKEN;
	const payload = JSON.stringify({
		client_id: CLIENT_ID,
		grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer-session-token',
		session_token: login_session.session_token,
	});

	try {
		const response = await http.post(CONFIG.URLS.SERVICE_TOKEN, {
			headers,
			gzip: true,
			body: payload
		});

		return JSON.parse(response);
	} catch (error) {
		throw new Error(error);
	}
}

async function getUserInfo(service_session) {
	const headers = CONFIG.HEADERS.USER_ME;
	headers.Authorization = `Bearer ${service_session.access_token}`;

	try {
		const response = await http.get(CONFIG.URLS.USER_ME, {
			headers,
			gzip: true
		});

		return JSON.parse(response);
	} catch (error) {
		throw new Error(error);	
	}
}

async function getWebAPISession(service_session, user_data) {
	const headers = CONFIG.HEADERS.LOGIN;
	const payload = JSON.stringify({
		parameter: {
			'f': await getF(service_session),
			'naIdToken': service_session.id_token,
			'naCountry': user_data.country,
			'naBirthday': user_data.birthday,
			'language': user_data.language
		}
	});

	try {
		const response = await http.post(CONFIG.URLS.LOGIN, {
			headers,
			gzip: true,
			body: payload
		});
	
		return JSON.parse(response);
	} catch (error) {
		throw new Error(error);
	}
}

async function getF(service_session) {
	try {
		const response = await http.post('https://elifessler.com/s2s/api/gen', {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'user-agent': 'NOAuth/1.0.1'
			},
			body: querystring.stringify({
				'naIdToken': service_session.id_token
			})
		});

		return JSON.parse(response).f;
	} catch (error) {
		throw new Error(error);	
	}
}

async function getUserFriendList(web_api_session) {
	const headers = CONFIG.HEADERS.FRIEND_LIST;

	headers['Authorization'] = `Bearer ${web_api_session.result.webApiServerCredential.accessToken}`;

	try {
		const response = await http.post(CONFIG.URLS.FRIEND_LIST, {
			headers,
			gzip: true
		});
	
		return JSON.parse(response);
	} catch (error) {
		throw new Error(error);
	}
}

module.exports = {
	getBasicUserData: async function(nintendo_user_session) {
		return await getUserInfo(nintendo_user_session.service_session);
	},
	getFriendList: async function(nintendo_user_session) {
		return await getUserFriendList(nintendo_user_session.web_api_session);
	},
	wrapApp: function(app) {
		app.NOAuth = () => {
			LoginWindow = new BrowserWindow();
			const headers = CONFIG.HEADERS.AUTHORIZE;
			const options = {
				userAgent: headers['User-Agent'],
				extraHeaders: `Accept-Encoding: ${headers['Accept-Encoding']}`
			};

			LoginWindow.setMenu(null);
			LoginWindow.loadURL(generateLoginURL(), options);
		};
		
		protocol.registerHttpProtocol(`npf${CLIENT_ID}`, async (reqest) => {
			const token = reqest.url.match(/eyJhbGciOiJIUzI1NiJ9\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g)[0];
			
			const headers = CONFIG.HEADERS.AUTHORIZE;
			const payload = JSON.stringify({
				client_id: CLIENT_ID,
				session_token_code: token,
				session_token_code_verifier: GLOBAL_VERIFIER
			});
	
			headers['Content-Type'] = 'application/json';
			headers['Content-Length'] = Buffer.byteLength(payload);
	
			try {
				const response = await http.post(CONFIG.URLS.SESSION_TOKEN, {
					headers,
					gzip: true,
					body: payload
				});
		
				const nintendo_user_session = await createDetailedUserSession(JSON.parse(response));
		
				app.emit('nintendo_user_session', nintendo_user_session);
			} catch (error) {
				throw new Error(error);
			}
			LoginWindow.close();
		});
	}
};