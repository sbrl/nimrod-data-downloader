"use strict";

import AsyncFtpClient from './AsyncFtpClient.mjs';

class FtpClientManager {
	constructor() {
		this.client = new AsyncFtpClient();
		this.connect_obj = null;
	}
	
	async connect(ftp_url, user, password) {
		let url_parsed = url.parse(ftp_url);
		console.log(`[AsyncFtpClient] host`, url_parsed.hostname, `port`, parseInt(url_parsed.port, 10));
		this.connect_obj = {
			host: url_parsed.hostname,
			port: parseInt(url_parsed.port, 10),
			
			user,
			password
		};
		
		await this.do_connect();
	}
	
	async do_connect() {
		if(this.connect_obj == null)
			throw new Error("Error: Can't reconnect when we haven't connected in the first place.");
		
		this.client.connectAsync(this.connect_obj);
	}
	
	async force_reconnect() {
		this.client.destroy();
		this.client = new AsyncFtpClient();
		await this.do_connect();
	}
}

export default FtpClientManager;
