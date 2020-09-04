"use strict";

import EventEmitter from 'events';
import os from 'os';

import workerpool from 'workerpool';

import l from '../../helpers/Log.mjs';
import FtpClient from '../ftp/AsyncFtpClient.mjs';
import FilenameIterator from '../ftp/FilenameIterator.mjs';

class DownloadManager extends EventEmitter {
	constructor(in_settings, in_credentials) {
		super();
		
		this.settings = in_settings;
		this.credentials = in_credentials;
		
		this.pool_max_queue_size = os.cpus().length *  1.4;
		
		this.queue_tar = [];
	}
	
	async setup() {
		await Promise.all([
			this.setup_ftp_client(),
			this.setup_worker_pool()
		]);
	}
	
	async setup_ftp_client() {
		// 1: Initialise FTP client
		this.ftpclient = new FtpClient();
		this.ftpclient.on("error", (error) => {
			this.emit("error", error);
			throw error;
		});
		
		await this.ftpclient.connectAsyncSimple(
			this.settings.cli.ftp_url,
			this.credentials.user,
			this.credentials.password
		);
		
		// 2: Filename iterator
		this.filename_iterator = new FilenameIterator(this.ftpclient);
	}
	
	async setup_worker_pool() {
		this.pool = workerpool.pool("./DownloadWorkerRoot.mjs", {
			workerType: "process",
			maxQueueSize: os.cpus().length * 1.5
		});
		this.pool_proxy = await this.pool.proxy();
	}
	
	async run() {
		
	}
	
	queue_tar_check() {
		for(let i in this.queue_tar) {
			// TODO: Wrap promise so we can check its state
			if(promise_is_fulfilled) {
				this.queue_tar.splice(i, 1)[0];
				this.emit("tar_finis");
			}
		}
	}
	
	async queue_pool_tar(filepath, target, bounds, tmpdir) {
		while(this.pool.stats().pendingTasks >= this.pool_max_queue_size)
			await once(this, "tar_finish");
		
		this.queue_tar.push(
			this.pool_proxy.parse_tar(filepath, target, bounds, tmpdir)
		);
		this.emit("tar_start");
	}
}

export default DownloadManager;
