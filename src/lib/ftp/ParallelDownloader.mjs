"use strict";

import { pipeline } from 'stream';
import { promisify } from 'util'
import path from 'path';
import fs from 'fs';

import p_retry from 'p-retry';
import p_timeout from 'p-timeout';

import a from '../../helpers/Ansi.mjs';
import l from '../../helpers/Log.mjs';
import settings from '../../bootstrap/settings.mjs';
import PromiseWrapper from '../async/PromiseWrapper.mjs';
import { ErrorWrapper } from '../Errors.mjs';
import make_on_failure_handler from '../async/RetryFailureHandler.mjs';

/**
 * Parallel FTP download manager.
 * The FTP client instance must be provided separately during initialisation.
 */
class ParallelDownloader {
	constructor(in_ftp) {
		this.ftp = in_ftp;
		
		this.pipeline = promisify(pipeline);
	}
	
	/**
	 * Downloads the file at the specific source path to the
	 * given target directory.
	 * Note that the source path should *not*  include the hostname - that is
	 * passed when initialising the FTP Client object.
	 * @param	{string}	source	The source path to download from.
	 * @param	{string}	target	The target filepath to download the source to.
	 * @return	{Promise}	A promise that resolves when downloading is complete.
	 */
	async download_single(source, target) {
		if(!fs.existsSync(path.dirname(target)))
			throw new Error("Error: The target directory does not exist.");
		
		// l.info(`[ParallelDownloader] Beginning download of ${a.fgreen}${source}${a.reset} to ${a.fgreen}${target}${a.reset}`);
		let stream_download = await this.ftp.client.getAsync(source);
		let stream_write = fs.createWriteStream(target);
		
		await this.pipeline(
			stream_download,
			stream_write
		);
		// l.info(`[ParallelDownloader] Saved ${a.fgreen}${source}${a.reset} to ${a.fgreen}${target}${a.reset}`)
		l.info(`${a.fmagenta}[ParallelDownloader]${a.reset} Downloaded ${a.fmagenta}${a.hicol}${path.basename(source)}${a.reset}`)
	}
	
	/**
	 * Downloads all the paths yielded ny the given *async* generator.
	 * Note that paths are *not* guaranteed to be yielded in the same order
	 * that the input generator yields them in the first place, because of
	 * varying download speeds, filesizes, and other factors.
	 * @param	{Generator<Promise<string>>}	generator	The *async* generator that yields the  paths tot he files to download.
	 * @param	{string}						target_dir	The target directory to download files to.
	 * @return	{Generator<Promise<string>>}	An async generator that yields target filenames as they are downloaded.
	 */
	async *download_multiple(generator, target_dir) {
		if(typeof target_dir != "string")
			throw new Error("Error: The specified target_dir is not a string.");
		
		if(!fs.existsSync(target_dir))
			throw new Error(`Error: The target directory '${target_dir}' does not exist.`);
		
		l.log(`[ParallelDownloader] Starting, downloading ${a.fyellow}${settings.config.ftp.parallel}${a.reset} files in parallel`);
		
		let wrappers = [],
			promises = [];
		
		let i = 0;
		for await (let nextpath of generator()) {
			if(wrappers.length > settings.config.ftp.parallel) {
				let resolved_wrapper = await this.wait_for_completion(wrappers, promises);
				yield resolved_wrapper._target_path;
			}
			
			let target = path.join(
				target_dir,
				`${i}-${path.basename(nextpath)}`
			);
			
			let wrapper_failure_handler = make_on_failure_handler(
				`[ParallelDownloader/download_single_wrapper]`,
				settings.config.ftp.retry_delay
			);
			let wrapper = new PromiseWrapper(async () => {
				return await p_retry(async () => {
					return await p_timeout(
						this.download_single(nextpath, target),
						settings.config.ftp.download_timeout * 1000
					);
				}, {
					retries: settings.config.ftp.retries,
					maxRetryTime: settings.config.ftp.download_timeout * 1000,
					onFailedAttempt: async (error) => {
						await this.ftp.force_reconnect();
						await wrapper_failure_handler(error);
					}
				});
			});
			wrapper._target_path = target;
			
			wrappers.push(wrapper);
			promises.push(wrapper.run());
			
			i++;
		}
	}
	
	/**
	 * Waits until a promise resolves (or rejects :-/), and then returns the
	 * corresponding wrapper.
	 * @param	{PromiseWrapper[]}			wrappers	The PromiseWrapper instances.
	 * @param	{Promise[]}					promises	The promises to wait on.
	 * @return	{Promise<PromiseWrapper>}	The next PromiseWrapper that resolves.
	 */
	async wait_for_completion(wrappers, promises) {
		await Promise.race(promises);
		
		for(let i = 0; i < wrappers.length; i++) {
			if(wrappers[i].is_finished) {
				let wrapper = wrappers.splice(i, 1);
				promises.splice(i, 1); // Remove the raw promise from the secondary tracking array too
				
				if(wrapper.length < 1)
					throw new Error(`Error: No wrapper was spliced!`);
					
				if(wrapper[0].is_failed)
					throw new ErrorWrapper(`[ParallelDownloader/wait_for_completion] Error: Promise failed!`, wrapper[0].error);
				
				return wrapper[0];
			}
		}
		throw new Error(`Error: Failed to locate resolved promise.`);
	}
}

export default ParallelDownloader;
