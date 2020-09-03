"use strict";

import path from 'path';

import a from '../../helpers/Ansi.mjs';
import l from '../../helpers/Log.mjs';

class FilenameIterator {
	constructor(in_ftpclient) {
		this.ftpclient = in_ftpclient;
		
		this.filename_blacklist = new Map();
	}
	
	blacklist_filename(filename) {
		this.filename_blacklist.set(filename, true);
	}
	
	is_blacklisted(filename) {
		return this.filename_blacklist.has(filename);
	}
	
	async *iterate(remote_path) {
		let year_dirs = (await this.ftpclient.listAsync(this.settings.ceda.ftp_path))
			.filter((obj) => obj.type == "d")
			.map((obj) => obj.name);
		
		for(let year_str of year_dirs) {
			if(year <= 2005) {
				l.warn(`Skipping year ${year} because of format problems`);
				count_done++;
				continue;
			}
			
			let files = await retry_async(3, async () => await this.client.listAsync(target));
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
