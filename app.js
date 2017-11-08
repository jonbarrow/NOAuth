let https = require('https'),
    electron = require('electron'),
    path = require('path'),
    url = require('url'),
    zlib = require('zlib'),
    querystring = require('querystring'),
    crypto = require('crypto'),
	protocol = electron.protocol,
    BrowserWindow = electron.BrowserWindow,
    ipcMain = electron.ipcMain,
    app = electron.app;
   
let ApplicationWindow;
let GLOBAL_VERIFIER;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CLIENT_ID = '71b963c1b7b6d119';
const API_CONFIG = {
    HEADERS: {
        AUTHORIZE: {
            'Accept-Encoding': 'gzip',
            'User-Agent': 'OnlineLounge/1.0.4 NASDKAPI Android'
        },
        TOKEN: {
            'Host': 'accounts.nintendo.com',
            'Content-Type': 'application/json; charset=utf-8',
            'Connection': 'keep-alive',
            'User-Agent': 'OnlineLounge/1.0.4 NASDKAPI iOS',
            'Accept': 'application/json',
            'Accept-Language': 'en-US',
            'Accept-Encoding': 'gzip, deflate'
        },
        USER_ME: {
            'Host': 'api.accounts.nintendo.com',
            'Connection': 'keep-alive',
            'Accept': 'application/json',
            'User-Agent': 'OnlineLounge/1.0.4 NASDKAPI iOS',
            'Accept-Language': 'en-US',
            'Authorization': null,
            'Accept-Encoding': 'gzip, deflate'
        },
        LOGIN: {
            'X-ProductVersion': '1.1.0',
            'X-Platform': 'Android',
            'User-Agent': 'com.nintendo.znca/1.1.0 (Android/7.0)',
            'Accept': 'application/json',
            'Authorization': 'Bearer',
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': '977',
            'Host': 'api-lp1.znc.srv.nintendo.net',
            'Connection': 'Keep-Alive',
            'Accept-Encoding': 'gzip'
        }
    },
    URLS: {
        AUTHORIZE: 'https://accounts.nintendo.com/connect/1.0.0/authorize',
        SESSION_TOKEN: 'https://accounts.nintendo.com/connect/1.0.0/api/session_token',
        TOKEN: 'https://accounts.nintendo.com/connect/1.0.0/api/token',
        USER_ME: 'https://api.accounts.nintendo.com/2.0.0/users/me',
        LOGIN: 'https://api-lp1.znc.srv.nintendo.net/v1/Account/Login'
    },
    PAYLOADS: {
        AUTHORIZE: {
            client_id: CLIENT_ID,
            redirect_uri: 'npf' + CLIENT_ID + '://auth',
            response_type: 'session_token_code',
            scope: 'openid user user.birthday user.mii user.screenName',
            session_token_code_challenge: null,
            session_token_code_challenge_method: 'S256',
            state: null,
            theme: 'login_form'
        },
        SESSION_TOKEN: {
            client_id: CLIENT_ID,
            session_token_code: null,
            session_token_code_verifier: 'S256',
        },
        TOKEN: {
            client_id: CLIENT_ID,
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer-session-token',
            session_token: null,
        },
        LOGIN: {
            parameter: {
                naIdToken: null,
                naCountry: null,
                naBirthday: null,
                language: null,
                f: null
            }
        }
    }
}

app.on('ready', () => {
    createWindow('index');
    protocol.registerHttpProtocol('npf' + CLIENT_ID, (reqest, cb) => {
        let token = reqest.url.match(/eyJhbGciOiJIUzI1NiJ9\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g)[0],
            session_url = new url.URL(API_CONFIG.URLS.SESSION_TOKEN);
        
        let payload = API_CONFIG.PAYLOADS.SESSION_TOKEN,
            headers = API_CONFIG.HEADERS.AUTHORIZE;

        payload.session_token_code = token;
        payload.session_token_code_verifier = GLOBAL_VERIFIER;
        payload = JSON.stringify(payload)

        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload);

        let post_options = {
            hostname: session_url.hostname,
            port: 443,
            path: session_url.pathname,
            method: 'POST',
            headers: headers
        };

        let end_buffer = '';
        
        let request = https.request(post_options, (response) => {
            let gunzip = zlib.createGunzip();            
            response.pipe(gunzip);
    
            gunzip.on('data', (chunk) => {
                end_buffer += chunk.toString();
            }).on('end', () => {
                obtainDetailedUserInformation(JSON.parse(end_buffer).session_token);
            }).on('error', (error) => {
                throw new Error(error)
            });
        });

        request.on('error', (error) => {
            throw new Error(error)
        });
        
        request.write(payload);
        request.end();
    })
});

app.on('window-all-closed', () => {
  	if (process.platform !== 'darwin') {
    	app.quit(); // OSX
  	}
});

ipcMain.on('open_login_form', () => {
    let LoginWindow = new BrowserWindow(),
        headers = API_CONFIG.HEADERS.AUTHORIZE,
        options = {
            userAgent: headers['User-Agent'],
            extraHeaders: 'Accept-Encoding: ' + headers['Accept-Encoding']
        };

    LoginWindow.setMenu(null);
    LoginWindow.loadURL(generateLoginURL(), options);
});

function createWindow(file) {
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

    ApplicationWindow.webContents.on('new-window', function(event, url) {
        event.preventDefault();
        shell.openExternal(url);
    });
}

function generateLoginURL() {
    let payload = API_CONFIG.PAYLOADS.AUTHORIZE;
    
    payload.session_token_code_challenge = createChallenge();
    payload.state = createState(50);

    return API_CONFIG.URLS.AUTHORIZE + '?' + querystring.stringify(payload);
}
function generateSessionURL(token) {
    let payload = API_CONFIG.PAYLOADS.SESSION_TOKEN;
    
    payload.session_token_code = token;
    payload.session_token_code_verifier = GLOBAL_VERIFIER;

    return API_CONFIG.URLS.SESSION_TOKEN + '?' + querystring.stringify(payload);
}

function createState(length) {
    let output = '';
    for (var i = 0; i < length; i++) {
        output += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }

    return output;
}

function createChallenge() {
    GLOBAL_VERIFIER = createState(50);
    
    let hash = crypto.createHash('sha256').update(GLOBAL_VERIFIER).digest(),
        _url = Buffer.from(hash).toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '')
                .replace(/=/g, '');
   
    return _url;
}

function obtainDetailedUserInformation(session_token) {
    getAccessToken(session_token, (access_session) => {
        let access_token = access_session.access_token,
            id_token = access_session.id_token;
            
        getUserInfo(access_token, (user_data) => {
            loginUser(access_session, user_data, (user_data_extended) => {
                console.log(user_data);
                console.log('\n\n\n');
                console.log(user_data_extended);

                // Everything is stuck here since loginUser() fails every time.
                // Can't continue until `f` is cracked.

            });
        });
        
    });
}

function loginUser(access_session, user_data, cb) {
    let token_url = new url.URL(API_CONFIG.URLS.LOGIN);
    
    let headers = API_CONFIG.HEADERS.LOGIN,
        payload = API_CONFIG.PAYLOADS.LOGIN,
        hash = crypto.createHash('sha256').update(access_session.id_token).digest().toString('hex');
        // wtf is this. I've tried so many things, even hashing the whole session object.
        // Nothing seems to work.

    payload.parameter.naIdToken = access_session.id_token;
    payload.parameter.naCountry = user_data.country;
    payload.parameter.naBirthday = user_data.birthday;
    payload.parameter.language = user_data.language;
    payload.parameter.f = hash;
    payload = JSON.stringify(payload)

    let post_options = {
        hostname: token_url.hostname,
        port: 443,
        path: token_url.pathname,
        method: 'POST',
        headers: headers
    };

    let end_buffer = '';
    
    let request = https.request(post_options, (response) => {
        let gunzip = zlib.createGunzip();            
        response.pipe(gunzip);

        gunzip.on('data', (chunk) => {
            end_buffer += chunk.toString();
        }).on('end', () => {
            return cb(JSON.parse(end_buffer));
        }).on('error', (error) => {
            throw new Error(error)
        });
    });

    request.on('error', (error) => {
        throw new Error(error)
    });
    
    request.write(payload);
    request.end();
}

function getUserInfo(access_token, cb) {
    let headers = API_CONFIG.HEADERS.USER_ME,
        user_url = new url.URL(API_CONFIG.URLS.USER_ME);

    headers.Authorization = 'Bearer ' + access_token;

    let options = {
        hostname: user_url.hostname,
        port: 443,
        path: user_url.pathname,
        method: 'GET',
        headers: headers
    };

    let end_buffer = '';
    
    let request = https.get(options, (response) => {
        let gunzip = zlib.createGunzip();            
        response.pipe(gunzip);

        gunzip.on('data', (chunk) => {
            end_buffer += chunk.toString();
        }).on('end', () => {
            return cb(JSON.parse(end_buffer));
        }).on('error', (error) => {
            throw new Error(error)
        });
    });

    request.on('error', (error) => {
        throw new Error(error)
    });
}

function getAccessToken(session_token, cb) {
    let token_url = new url.URL(API_CONFIG.URLS.TOKEN);
    
    let payload = API_CONFIG.PAYLOADS.TOKEN,
        headers = API_CONFIG.HEADERS.TOKEN;

    payload.session_token = session_token;
    payload = JSON.stringify(payload)

    let post_options = {
        hostname: token_url.hostname,
        port: 443,
        path: token_url.pathname,
        method: 'POST',
        headers: headers
    };

    let end_buffer = '';
    
    let request = https.request(post_options, (response) => {
        let gunzip = zlib.createGunzip();            
        response.pipe(gunzip);

        gunzip.on('data', (chunk) => {
            end_buffer += chunk.toString();
        }).on('end', () => {
            return cb(JSON.parse(end_buffer));
        }).on('error', (error) => {
            throw new Error(error)
        });
    });

    request.on('error', (error) => {
        throw new Error(error)
    });
    
    request.write(payload);
    request.end();
}