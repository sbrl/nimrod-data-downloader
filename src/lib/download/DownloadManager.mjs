"use strict";

import { EventEmitter, once } from 'events';
import os from 'os';
import url from 'url';
import fs from 'fs';
import path from 'path';

import workerpool from 'workerpool';
import pretty_ms from 'pretty-ms';
import rmrf from 'rm-rf-async';

import settings from '../../bootstrap/settings.mjs';
import a from '../../helpers/Ansi.mjs';
import l from '../../helpers/Log.mjs';

import FtpClientManager from '../ftp/FtpClientManager.mjs';
import PromiseWrapper from '../async/PromiseWrapper.mjs';
import { ErrorWrapper } from '../Errors.mjs';

import FilenameIterator from '../ftp/FilenameIterator.mjs';
import ParallelDownloader from '../ftp/ParallelDownloader.mjs';

// Hack 'cause __dirname isn't defined when we're using ES6 modules for some crazy reason 
const __dirname = import.meta.url.slice(7, import.meta.url.lastIndexOf("/"));

class DownloadManager extends EventEmitter {
	constructor() {
		super();
		
		this.pool_max_queue_size = Math.floor(os.cpus().length * 1.4);
		
		/**
		 * The 
		 * @type {Array}
		 */
		this.queue_tar = [];
		
		this.fileids_existing = [];
	}
	
	async setup() {
		this.main_parsing_tmpdir = path.join(
			settings.config.output,
			`__tmpdir_parsing`
		);
		this.results_dir = path.join(
			settings.config.output,
			`results`
		);
		
		await Promise.all([
			this.setup_ftp_client(),
			this.setup_worker_pool()
		]);
		this.setup_parallel_downloader();
	}
	
	async setup_ftp_client() {
		// 1: Initialise FTP client
		this.ftp = new FtpClientManager();
		this.ftp.client.on("error", (error) => {
			this.emit("error", error);
			throw error;
		});
		
		l.log(`Connecting to ${a.fgreen}${settings.config.ftp.url}${a.reset}...`);
		await this.ftp.connect(
			settings.config.ftp.url,
			settings.config.ftp.username,
			settings.config.ftp.password
		);
		
		// 2: Filename iterator
		this.filename_iterator = new FilenameIterator(this.ftp);
		this.filename_iterator.blacklist_filename(settings.config.ftp.blacklist);
	}
	
	async setup_worker_pool() {
		this.pool = workerpool.pool(
			path.join(
				__dirname,
				"DownloadWorkerRoot.mjs"
			), {
				workerType: "process",
				maxQueueSize: Math.floor(os.cpus().length * 1.5),
				maxWorkers: os.cpus().length
			}
		);
		this.pool_proxy = await this.pool.proxy();
		l.log(`Worker pool initialised`);
	}
	
	setup_parallel_downloader() {
		this.parallel_downloader = new ParallelDownloader(
			this.ftp
		);
	}
	
	// ------------------------------------------------------------------------
	
	async start_downloader() {
		let tmp_dir = path.join(
			settings.config.output,
			`__tmpdir_tarfiles_download`
		);
		// Just in case there are some leftover files lying around
		if(fs.existsSync(tmp_dir))
			await rmrf(tmp_dir);
		
		await fs.promises.mkdir(tmp_dir);
		
		let ftp_path = url.parse(settings.config.ftp.url).pathname;
		if(settings.config.resume)
			this.fileids_existing = (await fs.promises.readdir(this.results_dir)).map((filename) => filename.match(/[0-9]+/)[0]);
		
		l.log(`Found ${this.fileids_existing.length} existsing files in the output directory`);
		
		return this.parallel_downloader.download_multiple(
			this.filename_iterator.iterate.bind(
				this.filename_iterator,
				ftp_path,
				this.fileids_existing
			),
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
		await fs.promises.copyFile(
			path.join(__dirname, "postprocess.sh"),
			path.join(settings.config.output, "postprocess.sh")
		);
		await fs.promises.chmod(path.join(settings.config.output, "postprocess.sh"), 0o755);
		
		await Promise.all([
			(async () => {
				if(fs.existsSync(this.main_parsing_tmpdir))
					await rmrf(this.main_parsing_tmpdir);
				await fs.promises.mkdir(this.main_parsing_tmpdir, { recursive: true })
			})(),
			fs.promises.mkdir(this.results_dir, { recursive: true })
		]);
		
		let downloader = await this.start_downloader();
		for await (let tar_path_next of downloader) {
			let date = this.extract_date(tar_path_next);
			
			// l.log(`${a.fmagenta}[ParallelDownloader]${a.reset} Downloaded ${a.fmagenta}${a.hicol}${path.basename(tar_path_next)}${a.reset}`);
			
			let tmpdir = path.join(
				this.main_parsing_tmpdir,
				date
			);
			await fs.promises.mkdir(tmpdir);
			
			await this.queue_pool_tar(
				tar_path_next,
				path.join(
					this.results_dir,
					`${date}.jsonl.gz`
				),
				settings.bounds,
				tmpdir
			);
			
		}
		
		if(this.queue_tar.length > 0) {
			l.log(`[DownloadManager] Waiting for all jobs to finish....`);
			await Promise.all(this.queue_tar.map((wrapper) => wrapper._promise));
			l.log(`[DownloadManager] All jobs finished: thank you :D`);
		}
		
		await this.ftp.disconnect();
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
		
		let stats = this.pool.stats();
		l.log(`[workerpool] Queuing ${a.fblue}${a.hicol}${path.basename(filepath)}${a.reset} (current status: ${stats.pendingTasks} tasks pending; ${this.pool_max_queue_size} max pending allowed; ${stats.busyWorkers}/${stats.totalWorkers} workers busy)`);
		
		// Create the wrapper
		let wrapper = new PromiseWrapper(async () => {
			let result = await this.pool_proxy.parse_tar(filepath, target, bounds, tmpdir);
			let filepath_basename = path.basename(filepath);
			if(result.status == "error") {
				l.error(`[workerpool] Worker threw error for ${filepath_basename}:`);
				l.error(result.error);
			}
			else
				l.log(`${a.fgreen}[workerpool]${a.reset} Parsed ${a.fgreen}${a.hicol}${filepath_basename}${a.reset} in ${pretty_ms(result.time_taken)}`);
			
			// Once complete, check the queue to get it to emit the tar_finish event
			this.queue_tar_check();
		});
		
		// Push it onto the queue
		this.queue_tar.push(wrapper);
		// Hacky way to keep track of the promise - essentially set-and-forget in this case
		wrapper._promise = (async () => {
			try {
				await wrapper.run();
			} catch(error) {
				l.error(`[DownloadManager] Caught error from PromiseWrapper: `, error);
				// Check the queue to handle any errors
				this.queue_tar_check();
			}
		})();
		
		this.emit("tar_start");
	}
}

export default DownloadManager;
