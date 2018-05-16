const url = require('url');
const zlib = require('zlib');

function get(uri, options={}) {
	const request_url = new url.URL(uri);

	options.hostname = request_url.hostname;
	options.path = request_url.pathname;
	options.method = 'GET';
	options.port = 443;

	return new Promise((resolve, reject) => {
		const lib = uri.startsWith('https') ? require('https') : require('http');
		const request = lib.get(options, (response) => {
			if (response.statusCode < 200 || response.statusCode > 299) {
				console.log('error options', options);
				reject(new Error(response.statusMessage));
			}

			let body = '';

			if (options.gzip) {
				const gunzip = zlib.createGunzip();

				gunzip.on('data', chunk => body += chunk);
				gunzip.on('end', () => resolve(body.toString()));
			
				response.pipe(gunzip);
			} else {
				response.on('data', chunk => body += chunk);
				response.on('end', () => resolve(body.toString()));
			}
		});
		
		request.on('error', (err) => reject(err));
	});
}

function post(uri, options={}) {
	const request_url = new url.URL(uri);

	options.hostname = request_url.hostname;
	options.path = request_url.pathname;
	options.method = 'POST';
	options.headers['content-length'] = (options.body ? Buffer.byteLength(options.body) : Buffer.byteLength(''));

	return new Promise((resolve, reject) => {
		const lib = uri.startsWith('https') ? require('https') : require('http');
		const request = lib.request(options, (response) => {
			if (response.statusCode < 200 || response.statusCode > 299) {
				reject(new Error(response.statusMessage));
			}

			let body = '';

			if (options.gzip) {
				const gunzip = zlib.createGunzip();

				gunzip.on('data', chunk => body += chunk);
				gunzip.on('end', () => resolve(body.toString()));
			
				response.pipe(gunzip);
			} else {
				response.on('data', chunk => body += chunk);
				response.on('end', () => resolve(body.toString()));
			}
		});
		
		request.on('error', (err) => reject(err));

		request.write((options.body ? options.body : ''));
		request.end();
	});
}

module.exports = {
	get, post
};