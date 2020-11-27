"use strict";

import Terrain50 from 'terrain50';

import { write_safe, end_safe } from '../../helpers/StreamHelpers.mjs';
import { floor_precision } from '../../helpers/Maths.mjs';
import l from '../../helpers/Log.mjs';


import RadarReader from '../RadarReader.mjs';
import HydroIndexWriter from './HydroIndexWriter.mjs';

class CaesarWriter {
	get init_complete() {
		return this.dir_out === null
			&& this.filepath_nimrod === null
			&& this.filepath_heightmap === null;
	}
	constructor(in_dry_run = false) {
		this.dry_run = in_dry_run;
		
		this.dir_out = null
		this.filepath_nimrod = null;
		this.filepath_heightmap = null;
		
		this.reader = null;
		this.writer_data = null;
		this.writer_interp_stats = null;
		
		this.time_step_interval = 300;
	}
	
	/**
	 * Initialises this CaesarWriter instance.
	 * @param	{string}	filepath_nimrod			The path to the file containing the nimrod rainfall radar data as compressed json objects, 1 per line.
	 * @param	{string}	filepath_heightmap		The path to the heightmap in the terrain50 asc format.
	 * @param	{string}	dir_out					The path to the directory to write the output to
	 * @param	{Boolean}	[data_to_stdout=false]	Whether to write the converted data to stdout instead of to a directory. Useful for large datasets, but requires a version of HAIL-CAESAR that's patched to support taking the data in via the standard input.
	 * @returns {Promise}	A Promise that resolves when the initialisation is complete.
	 */
	async init(filepath_nimrod, filepath_heightmap, dir_out, data_to_stdout = false) {
		this.filepath_nimrod = filepath_nimrod;
		this.filepath_heightmap = filepath_heightmap;
		this.dir_out = dir_out;
		
		this.reader = new RadarReader();
		this.reader.enable_interp_stats(path.join(this.dir_out, "interpolated_timestamps.txt"));
		
		if(!this.dry_run) {
			if(!fs.existsSync(this.dir_out))
				fs.promises.mkdir(this.dir_out, 0o750);
			
			if(!data_to_stdout)
				this.writer_data = fs.createWriteStream(
					path.join(this.dir_out, "rainfall.txt")
				);
			else
				this.writer_data = process.stdout;
			
			this.writer_hydro = new HydroIndexWriter(
				path.join(this.dir_out, "hydroindex.asc"),
				Terrain50.Parse(await fs.promises.readFile(this.filepath_heightmap, "utf-8"))
			);
		}
		
		// We need the first line here 'cause we need to infer the metadata
		this.first_line = JSON.parse(await this.reader.next());
	}
	
	async write_all() {
		await this.write_hydroindex();
		await this.write_data();
	}
	
	async write_hydroindex() {
		if(!this.init_complete)
			throw new Error("Error: Filepaths aren't yet specified (did you remember to call and await .init()?)");
		
		await this.writer_hydro.write(first_line);
		console.log(`HydroIndexWriting complete`);
	}
	
	async write_data() {
		if(!this.init_complete)
			throw new Error("Error: Filepaths aren't yet specified (did you remember to call and await .init()?)");
		
		// Remember that the entire thing is actually rotated by 90 degrees here
		
		let bytes_written_total = await this.write_line(this.first_line);
		
		l.info("Beginning main data conversion.");
		
		this.first_line = null; // Free up memory later on by deleting the original variable reference
		let count = 0;
		for await(let obj of this.reader.iterate(this.filepath_nimrod)) {
			bytes_written_total += await write_line(obj);
			count++;
			
			l.log(`Written data for ${obj.timestamp.toISOString()}`);
		}
		process.stderr.write("\n");
		
		// Explicitly close the streams
		await this.writer_data.end();
		
		l.log("Done");
		l.log(`Generated ${count} timesteps total (${bytes_written_total} bytes written)`);
	}
	
	/**
	 * Writes a line to the output for the given data object.
	 * @param	{PromiseWritable}	stream_out	The (promise) stream to write to
	 * @param	{Object}	obj		The object to write to the console.
	 * @return	{Promise}	A Promise that resolves when writing is complete.
	 */
	async write_line(obj) {
		let string = obj.data.map((row) => row.map((val) => floor_precision(val, 100000)).join(" ")).join(" ");
		
		if(!this.dry_run) {
			await write_safe(this.writer_data, string);
			await write_safe(this.writer_data, `\n`);
		}
		return string.length + 1; // Include the newline character
	}
}

export default CaesarWriter;
