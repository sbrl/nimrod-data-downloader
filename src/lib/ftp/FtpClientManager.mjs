"use strict";

import url from 'url';

import p_retry from 'p-retry';
import p_timeout from 'p-timeout';

import l from '../../helpers/Log.mjs';
import a from '../../helpers/Ansi.mjs';
import pretty_ms from 'pretty-ms';

import settings from '../../bootstrap/settings.mjs';
import AsyncFtpClient from './AsyncFtpClient.mjs';
import make_on_failure_handler from '../async/RetryFailureHandler.mjs';
import sleep_async from '../async/Sleep.mjs';

class FtpClientManager {
	constructor() {
		this.client = null;
		this.connect_obj = null;
		
		this.reconnect_grace_period = 60 * 1000; // Don't reconnect more than once every minute
		
		this._make_new_client();
	}
	
	_make_new_client() {
		this.last_reconnect = +new Date();
		this.client = new AsyncFtpClient();
		this.client.on("error", (error) => {
			l.error(`[FtpClientManager] Caught error from client, force-reconnecting:`, error);
			this.force_reconnect();
		})
	}
	
	/**
	 * Establishes a connection to the remote ftp server with the given details.
	 * @param	{string}	ftp_url		The URL of the FTP server. Note that it MUST include the port number.
	 * @param	{string}	user		The username to login with.
	 * @param	{string}	password	The password to login with.
	 * @return	{Promise}	A Promimse that resolves once the connection has been established.
	 */
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
	
	/**
	 * Connects the client to the remote FTP server using the stored connection
	 * object that was constructed previously.
	 * @return	{Promise}	A Promise that resolves once the connection to the remote server has been established.
	 */
	async do_connect() {
		if(this.connect_obj == null)
			throw new Error("Error: Can't reconnect when we haven't connected in the first place.");
		
		await this.client.connectAsync(this.connect_obj);
		l.log(`[FtpClientManager/do_connect] Connected to ${a.fgreen}${this.connect_obj.host}:${this.connect_obj.port} successfully`);
	}
	
	/**
	 * Disconnects the ftp client from the remote server gracefully.
	 * @return	{Promise}	A Promise that resolves once the connection has been closed.
	 */
	async disconnect() {
		l.log(`[FtpClientManager] Disconnecting from remote server`);
		await this.client.endAsync();
		l.log(`[FtpClientManager] Disconnect operation successful`);
	}
	
	async force_reconnect(force = false) {
		let time_since_last = new Date() - this.last_reconnect;
		if(!force && time_since_last < this.reconnect_grace_period) {
			l.warn(`[FtpClientManager] Forceful reconnect requested, but the last one was ${pretty_ms(time_since_last)} ago (grace period of ${pretty_ms(this.reconnect_grace_period)}) - refusing to reconnect again until the grace period expires`);
		}
		l.warn(`[FtpClientManager] Commencing forceful reconnect (last reconnect was ${pretty_ms(time_since_last)} ago).`);
		// Try to end the connection gracefully, but if it doesn't close after 10s then it's ended forcefully instead
		await this.client.endAsync();
		l.info(`[FtpClientManager/force_reconnect] Destroyed old connection`);
		await sleep_async(30*1000);
		this.client = new AsyncFtpClient();
		l.info(`[FtpClientManager/force_reconnect] Created new connection`);
		await this.do_connect();
	}
	
	async list(filepath) {
		return await p_retry(async () => {
				return await p_timeout(
					this.client.listAsync(filepath),
					{ milliseconds: settings.config.ftp.download_timeout * 1000 }
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
