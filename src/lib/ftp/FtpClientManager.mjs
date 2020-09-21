"use strict";

import url from 'url';

import p_retry from 'p-retry';
import p_timeout from 'p-timeout';

import settings from '../../bootstrap/settings.mjs';
import AsyncFtpClient from './AsyncFtpClient.mjs';
import make_on_failure_handler from '../async/RetryFailureHandler.mjs';

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
	
	async list(filepath) {
		return await p_retry(async () => {
				return await p_timeout(
					this.client.listAsync(filepath),
					settings.config.ftp.download_timeout * 1000
				);
			}, {
				retries: settings.config.ftp.retries,
				onFailedAttempt: async () => {
					this.force_reconnect();
					await make_on_failure_handler(
						`[FilenameIterator/list_years]`,
						settings.config.ftp.retry_delay
					);
				}
			});
	}
	
	// We can't wrap getAsync in the way we did above, because crashes may occur part-way through reading from the stream.
}

export default FtpClientManager;
