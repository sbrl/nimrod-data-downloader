"use strict";

import path from 'path';

import settings from '../../bootstrap/settings.mjs';
import a from '../../helpers/Ansi.mjs';
import l from '../../helpers/Log.mjs';
import sleep_async from '../async/Sleep.mjs';

import retry_async from 'p-retry';

class FilenameIterator {
	constructor(in_ftpclient) {
		this.ftpclient = in_ftpclient;
		
		this.filename_blacklist = new Map();
	}
	
	blacklist_filename(filename) {
		if(typeof filename == "string")
			this.filename_blacklist.set(filename, true);
		else if(filename instanceof Array) {
			for(let next of filename)
				this.filename_blacklist.set(next, true);
		}
	}
	
	is_blacklisted(filename) {
		return this.filename_blacklist.has(filename);
	}
	
	async *iterate(remote_path) {
		let year_dirs = (await retry_async(async () => await this.ftpclient.listAsync(remote_path), {
				retries: settings.config.ftp.retries,
				onFailedAttempt: async () => sleep_async(settings.config.ftp.retry_delay)
			}))
			.filter((obj) => obj.type == "d")
			.map((obj) => obj.name);
		
		l.log(`[FilenameIterator] Found years on server: ${year_dirs.join(", ")}`);
		
		for(let year_str of year_dirs) {
			let year = parseInt(year_str, 10);
			if(year <= 2005) {
				l.warn(`[FilenameIterator] Skipping year ${year} because of format problems`);
				continue;
			}
			
			let files = await retry_async(
				async () => await this.ftpclient.listAsync(target), {
					retries: settings.config.ftp.retries,
					onFailedAttempt: async () => sleep_async(settings.config.ftp.retry_delay)
				}
			);
			files.sort();
			
			for(let filename of files) {
				if(is_blacklisted) {
					l.log(`[FilenameIterator] Skipping blacklisted filename ${a.hicol}${filename}${a.reset}`);
					continue;
				}
				
				l.log(`[FilenameIterator] Yielding filename ${a.fgreen}${filename}${a.reset} as full path`);
				
				yield path.join(
					remote_path,
					year_str,
					filename
				);
			}
		}
	}
}

export default FilenameIterator;
