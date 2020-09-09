"use strict";

import { pipeline } from 'stream';
import { promisify } from 'util'
import path from 'path';
import fs from 'fs';

import PromiseWrapper from '../PromiseWrapper.mjs';

/**
 * Parallel FTP download manager.
 * The FTP client instance must be provided separately during initialisation.
 */
class ParallelDownloader {
	constructor(in_ftpclient, in_parallel = 3) {
		this.ftpclient = in_ftpclient;
		/** The number of simultaneous downloads we should do at once. @type {Number} */
		this.parallel = in_parallel;
		
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
		
		let stream_download = await this.ftpclient.getAsync(source);
		let stream_write = fs.createWriteStream(target);
		
		await this.pipeline(
			stream_download,
			stream_write
		);
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
		if(!fs.existsSync(target_dir))
			throw new Error(`Error: The target directory '${target_dir}' does not exist.`);
		
		let wrappers = [],
			promises = [];
		
		let i = 0;
		for await (let nextpath of generator()) {
			if(wrappers.length > this.parallel) {
				let resolved_wrapper = await this.wait_for_completion(wrappers, promises);
				yield resolved_wrapper._target_path;
			}
			
			let target = path.join(
				target_dir,
				`${i}-${path.basename(nextpath)}`
			);
			
			let wrapper = new PromiseWrapper(async () => {
				await download_single(nextpath, target);
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
				promises.splice(i, 1);
				
				if(wrapper.is_failed)
					throw new Error(`Error: Promise failed!`);
				
				return wrapper;
			}
		}
		throw new Error(`Error: Failed to locate resolved promise.`);
	}
}

export default ParallelDownloader;
