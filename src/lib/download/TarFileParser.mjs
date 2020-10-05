"use strict";

import fs from 'fs';
import path from 'path';

import rmrf from 'rm-rf-async';
import SpawnStream from 'spawn-stream';

import DatFileParser from './DatFileParser.mjs';
import { untar } from '../child_process/tar.mjs';
import GzipChildProcess from '../child_process/GzipChildProcess.mjs';
import { end_safe } from '../../helpers/StreamHelpers.mjs';

import l from '../../helpers/Log.mjs';

class TarFileParser {
	constructor() {
		this.datfileparser = new DatFileParser();
	}
	
	/**
	 * Parses the tar file at the given target and writes the result to a given filepath.
	 * Writes as an *ordered* json object stream.
	 * Deletes both the tar file and the temporary directory when done.
	 * @param	{string}	filepath	The path to the file to parse.
	 * @param	{string}	target		The path to the destination file to write to.
	 * @param	{Object}	bounds		The bounds to extract.
	 * @param	{string}	tmpdir		Path to an *empty* directory *that exists* to use as a temporary working area.
	 * @return	{Promise}	A promise that resolves when parsing & writing back to disk is complete.
	 */
	async parse_file(filepath, target, bounds, tmpdir) {
		// 1: Validation
		if(!fs.existsSync(tmpdir))
			throw new Error(`[TarFileParser] Error: The specified temporary directory '${tmpdir}' doesn't exist.`);
		if(!fs.existsSync(filepath))
			throw new Error(`[TarFileParser] Error: The specified source file '${filepath}' doesn't exist.`);
		
		// 2: Extract the tar file
		await untar(filepath, tmpdir);
		
		// NOTE: untar may need adjusting to flatten the output / strip the filename prefixes if it doesn't like extracting to the given directory we tell it to
		
		// 3: Investigate extracted filenames
		let filenames = await fs.promises.readdir(tmpdir);
		filenames.sort(); // TODO: Check that the output here is sorted correctly
		
		// 4: Setup output stream
		let out_disk = fs.createWriteStream(target);
		let gzip = new GzipChildProcess();
		// let gzip = SpawnStream("gzip");
		// gzip.pipe(out_disk);
		gzip.stdout.pipe(out_disk);
		
		// 5: Parse the inner files
		for(let filename of filenames) {
			try {
				await this.datfileparser.parse_file(
					path.join(tmpdir, filename),
					gzip,
					bounds
				);
			} catch(error) {
				l.error(`[DatFileParser] Caught error parsing dat file '${filename}' - skipping:`);
				l.error(error);
			}
		}
		
		// 6: #Cleanup the output streams
		// await end_safe(gzip);	// gzip stdin
		await gzip.end_gracefully();
		await end_safe(out_disk); // close the writeable stream that pushes data to disk 
		
		// 7: Delete the temporary directory
		await Promise.all([
			rmrf(tmpdir, { log: false }),
			fs.promises.unlink(filepath)
		]);
	}
}

export default TarFileParser;
