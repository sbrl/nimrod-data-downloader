"use strict";

import fs from 'fs';

import { eat_stream_gunzip_maybe } from '../../helpers/EatStream.mjs';
import NimrodParser from '../parser/NimrodParser.mjs';
import { write_safe } from '../../helpers/StreamHelpers.mjs';
import { ErrorWrapper } from '../Errors.mjs';

class DatFileParser {
	constructor() {
		this.parser = new NimrodParser();
	}
	
	/**
	 * Parses the data in the specified filepath, and writes it to the target
	 * as a gzipped json object.
	 * @param	{string}	filepath	The path to the file to parse.
	 * @param	{Stream}	stream_out	The target stream to write the result to.
	 */
	async parse_file(filepath, stream_out) {
		let buffer = await this.read_all_data(filepath),
			obj = null;
		
		try {
			obj = this.parser.parse(buffer);
		} catch(error) {
			throw new ErrorWrapper(`Error: Failed parsing binary invalid data from buffer.`, error);
		}
		if(obj == null)
			throw new Error(`Error: Binary file parser returned null`);
		await write_json(obj, stream_out);
	}
	
	async read_all_data(filepath) {
		if(!fs.existsSync(filepath))
			throw new Error(`[DatFileParser] Error: The file at '${filepath}' doesn't exist.`);
		
		let file_in = fs.createReadStream(filepath);
		let buffer = await eat_stream_gunzip_maybe(file_in);
		
		return buffer;
	}
	
	async write_json(obj, stream_out) {
		await write_safe(stream_out, JSON.stringify(obj));
	}
}

export default DatFileParser;
