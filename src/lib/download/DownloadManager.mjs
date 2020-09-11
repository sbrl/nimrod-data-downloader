"use strict";

import { EventEmitter } from 'events';
import os from 'os';
import url from 'url';
import fs from 'fs';
import path from 'path';

import workerpool from 'workerpool';

import settings from '../../bootstrap/settings.mjs';
import a from '../../helpers/Ansi.mjs';
import l from '../../helpers/Log.mjs';

import FtpClient from '../ftp/AsyncFtpClient.mjs';
import PromiseWrapper from '../PromiseWrapper.mjs';

import FilenameIterator from '../ftp/FilenameIterator.mjs';
import ParallelDownloader from '../ftp/ParallelDownloader.mjs';

// Hack 'cause __dirname isn't defined when we're using ES6 modules for some crazy reason 
const __dirname = import.meta.url.slice(7, import.meta.url.lastIndexOf("/"));

class DownloadManager extends EventEmitter {
	constructor() {
		super();
		
		this.pool_max_queue_size = os.cpus().length *  1.4;
		
		/**
		 * The 
		 * @type {Array}
		 */
		this.queue_tar = [];
	}
	
	async setup() {
		await Promise.all([
			this.setup_ftp_client(),
			this.setup_worker_pool()
		]);
		this.setup_parallel_downloader();
	}
	
	async setup_ftp_client() {
		// 1: Initialise FTP client
		this.ftpclient = new FtpClient();
		this.ftpclient.on("error", (error) => {
			this.emit("error", error);
			throw error;
		});
		
		l.log(`Connecting to ${a.fgreen}${settings.config.ftp.url}${a.reset}...`);
		await this.ftpclient.connectAsyncSimple(
			settings.config.ftp.url,
			settings.config.ftp.username,
			settings.config.ftp.password
		);
		l.log(`Connected`);
		
		// 2: Filename iterator
		this.filename_iterator = new FilenameIterator(this.ftpclient);
		this.filename_iterator.blacklist_filename(settings.config.ftp.blacklist);
	}
	
	async setup_worker_pool() {
		this.pool = workerpool.pool(
			path.join(
				__dirname,
				"DownloadWorkerRoot.mjs"
			), {
				workerType: "process",
				maxQueueSize: os.cpus().length * 1.5
			}
		);
		this.pool_proxy = await this.pool.proxy();
		l.log(`Worker pool initialised`);
	}
	
	setup_parallel_downloader() {
		this.parallel_downloader = new ParallelDownloader(
			this.ftpclient
		);
	}
	
	// ------------------------------------------------------------------------
	
	async start_downloader() {
		let tmp_dir = path.join(
			settings.config.output,
			`__tmpdir_tarfiles_download`
		);
		await fs.promises.mkdir(tmp_dir);
		
		let ftp_path = url.parse(settings.config.ftp.url).pathname;
		
		return this.parallel_downloader.download_multiple(
			this.filename_iterator.iterate.bind(this.filename_iterator, ftp_path),
			tmp_dir
		);
	}
	
	extract_date(tar_path) {
		let matches = path.basename(tar_path).match(/[0-9]+/);
		if(matches == null)
			throw new Error(`Error: Failed to extract date from filename ${tar_path_next}.`);
		return matches[0];
	}
	
	async run() {
		let main_parsing_tmpdir = path.join(
			settings.config.output,
			`__tmpdir_parsing`
		);
		let results_dir = path.join(
			settings.config.output,
			`results`
		);
		await Promise.all([
			fs.promises.mkdir(main_parsing_tmpdir, { recursive: true }),
			fs.promises.mkdir(results_dir, { recursive: true })
		]);
		
		let i = 0;
		let downloader = await this.start_downloader();
		for await (let tar_path_next of downloader) {
			l.log(`${a.fmagenta}[ParallelDownloader] Downloaded ${tar_path_next}${a.reset}`);
			
			let tmpdir = path.join(
				main_parsing_tmpdir,
				i
			);
			await fs.promises.mkdir(tmpdir);
			
			await queue_pool_tar(
				tar_path_next,
				path.join(
					results_dir,
					`${this.extract_date(tar_path_next)}.jsonstream.gz`
				),
				settings.bounds,
				tmpdir
			);
			
			i++;
		}
	}
	
	queue_tar_check() {
		for(let i in this.queue_tar) {
			// It's finished! We shoudl do something about it.
			if(this.queue_tar[i].is_finished) {
				// Check if it failed
				if(this.queue_tar[i].is_failed)
					throw new ErrorWrapper(`Error: Worker pool tar parsing promise rejected!`, this.queue_tar[i].error);
				
				// Remove it from the list
				this.queue_tar.splice(i, 1)[0];
				
				// Emit the finish event
				this.emit("tar_finish");
			}
		}
	}
	
	/**
	 * Queues the parsing of a tar file on the workerpool.
	 * @param	{string}	filepath	The path to the tar file to parse. Will be automatically deleted oncce parsing is complete.
	 * @param	{string}	target		The path to the file to write the result to (as a gzipped stream of json objects)
	 * @param	{Object}	bounds		The bounds of the data that should be extracted.
	 * @param	{string}	tmpdir		The path to an *empty* temporary directory to use during the parsing process. Will be deleted automatically once the parsing process is complete.
	 * @return	{Promise}	A promise that resolves when the parsing process has *started* (note that the resolution of this Promise only indicates that the job has been successfully added to the queue, not that it has actually started yet).
	 */
	async queue_pool_tar(filepath, target, bounds, tmpdir) {
		while(this.pool.stats().pendingTasks >= this.pool_max_queue_size)
			await once(this, "tar_finish");
		
		l.log(`[workerpool] Queuing ${a.fblue}${a.hicol}${path.basename(filepath)}${a.reset}`);
		
		// Create the wrapper
		let wrapper = new PromiseWrapper(async () => {
			await this.pool_proxy.parse_tar(filepath, target, bounds, tmpdir);
			l.log(`${a.fgreen}[workerpool] Parsed ${path.basename(filepath)}${a.reset}`);
			
			// Once complete, check the queue to get it to emit the tar_finish event
			this.queue_tar_check();
		});
		
		// Push it onto the queue
		this.queue_tar.push(wrapper);
		// Hacky way to keep track of the promise - essentially set-and-forget in this case
		wrapper._promise = wrapper.run();
		
		this.emit("tar_start");
	}
}

export default DownloadManager;
