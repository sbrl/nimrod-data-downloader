"use strict";

import path from 'path';

import a from '../../helpers/Ansi.mjs';
import log from '../../helpers/NamespacedLog.mjs'; const l = log("parent:filenameiterator");


class FilenameIterator {
	constructor(in_ftp) {
		this.ftp = in_ftp;
		
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
	
	async *iterate(remote_path, skip_list = []) {
		let year_dirs = (await this.ftp.list(remote_path))
			.filter((obj) => obj.type == "d")
			.map((obj) => obj.name);
		
		l.log(`Found years on server: ${year_dirs.join(", ")}`);
		for(let year_str of year_dirs) {
			let year = parseInt(year_str, 10);
			if(year <= 2005) {
				l.warn(`Skipping year ${year} because of format problems`);
				continue;
			}
			
			let next_target = path.join(
				remote_path,
				year_str
			);
			
			let files = await this.ftp.list(next_target);
			files.sort();
			
			for(let filename_obj of files) {
				let filename = filename_obj.name;
				if(this.is_blacklisted(filename)) {
					l.log(`Skipping blacklisted filename ${a.hicol}${filename}${a.reset}`);
					continue;
				}
				
				let filename_date = filename.match(/[0-9]+/)[0];
				if(typeof filename_date != "string") {
					l.warn(`Warning: Failed to extract date for filename '${filename}', skipping`);
					continue;
				}
				
				if(skip_list.includes(filename_date)) {
					l.log(`Filename with date ${filename_date} has been done already, skipping`);
					continue;
				}
				
				// l.log(`[FilenameIterator] Yielding filename ${a.fgreen}${filename}${a.reset} as full path`);
				
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
