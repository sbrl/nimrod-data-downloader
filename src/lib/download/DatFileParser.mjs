"use strict";

import fs from 'fs';
import path from 'path';

import NimrodParser from '../parser/NimrodParser.mjs';
import extract_area from '../manip/ExtractArea.mjs';

import { eat_stream_gunzip_maybe } from '../../helpers/EatStream.mjs';
import { write_safe } from '../io/StreamHelpers.mjs';
import { ErrorWrapper } from '../Errors.mjs';
import make_radar_obj from '../manip/make_radar_obj.mjs';


class DatFileParser {
	constructor() {
		this.parser = new NimrodParser();
	}
	
	/**
	 * Parses the data in the specified filepath, and writes it to the target
	 * as a gzipped json object.
	 * @param	{string}	filepath	The path to the file to parse.
	 * @param	{Stream}	stream_out	The target stream to write the result to.
	 * @param	{Object?}	bounds		An object defining the bounds of the region to extract. If null, then no extraction is performed.
	 */
	async parse_file(filepath, stream_out, bounds) {
		// 1: Read in the file
		let buffer = await this.read_all_data(filepath);
		let obj = null;
		
		// 2: Parse the file
		try {
			obj = this.parser.parse(buffer);
		} catch(error) {
			throw new ErrorWrapper(`Error: Failed parsing binary invalid data from buffer read from filename ${path.basename(filepath)}.`, error);
		}
		if(obj == null)
			throw new Error(`Error: Binary file parser returned null`);
		
		// 3: Area extraction and simplification
		let data = obj.data_array;
		if(bounds !== null) {
			try {
				data = extract_area(bounds, obj);
			} catch(error) {
				throw new ErrorWrapper(`Error: Failed to extract an area from the parsed file object`, error);
			}
		}
		
		// 4: Make (simplified) object
		obj = make_radar_obj(obj, data, bounds);
		
		// 5: Write to the output stream
		await this.write_json(obj, stream_out);
	}
	
	async read_all_data(filepath) {
		if(!fs.existsSync(filepath))
			throw new Error(`[DatFileParser] Error: The file at '${filepath}' doesn't exist.`);
		
		let file_in = fs.createReadStream(filepath);
		let buffer = await eat_stream_gunzip_maybe(file_in);
		
		return buffer;
	}
	
	async write_json(obj, stream_out) {
		await write_safe(stream_out, `${JSON.stringify(obj)}\n`);
	}
}

export default DatFileParser;
