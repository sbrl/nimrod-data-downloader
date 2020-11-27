"use strict";

import nnng from 'nnng';

import Terrain50 from 'terrain50';

import settings from '../../bootstrap/settings.mjs';
import l from '../../helpers/Log.mjs';
import LowLevelWriter from '../../helpers/LowLevelWriter.mjs';


class HydroIndexWriter {
	/**
	 * Creates a new HydroIndexWriter.
	 * @param	{string}	filename	The filename to write to.
	 * @param	{Terrain50}	heightmap	The heightmap, as a Terrain50 instance, to reference.
	 * @param	{number}	cell_size	The cell size, in metres.
	 */
	constructor(filename, heightmap, cell_size) {
		this.filename = filename;
		this.heightmap = heightmap;
		this.cell_size = cell_size;
		this.symbol_newline = Symbol("hydroindex_write_generator_newline");
		
		// Where to take the coordinates from
		this.coords_mode = "heightmap"; // Can also be "settings"
	}
	
	async write(sample_obj) {
		this.stream_out = await LowLevelWriter.Open(this.filename);
		
		let corner = nnng.to(
			// HACK: According to the docs this is the wrong way around, but it appears to work this way and not the other way? I'm confused.
			settings.bounds.bottom_left.latitude,
			settings.bounds.bottom_left.longitude
		);
		if(this.coords_mode == "heightmap") {
			corner[0] = this.heightmap.meta.xllcorner;
			corner[1] = this.heightmap.meta.yllcorner;
		}
		
		let scale_factor = Math.floor(
			this.cell_size / this.heightmap.meta.cellsize
		);
		
		l.debug(`Corner:`, corner, `(from`, settings.bounds.bottom_left,`)`);
		l.debug(`Scale factor:`, scale_factor)
		
		await this.stream_out.write(`ncols ${sample_obj.size_extract.height*scale_factor}\n`);
		await this.stream_out.write(`nrows ${sample_obj.size_extract.width*scale_factor}\n`);
		await this.stream_out.write(`xllcorner ${corner[0]}\n`);
		await this.stream_out.write(`yllcorner ${corner[1]}\n`);
		await this.stream_out.write(`cellsize ${this.heightmap.meta.cellsize}\n`);
	
		// Write the cell indices
		// Note that hydro-index values start from 1, not 0
		// Note also that according to the codebase, multiple cells can have identical index values (although the code that handles this is O(n^3), when it could be O(n^2))
		
		let row = [];
		// The width & height from are the wrong way around because the data itself is transposed awkwardly
		for(let next of this.generate_indices(sample_obj.size_extract.height, sample_obj.size_extract.width, scale_factor)) {
			if(next != this.symbol_newline)
				row.push(next);
			else {
				await this.stream_out.write(row.join(" ") + `\n`);
				row.length = 0; // Clear the row out again now that we've flushed it to disk
			}
		}
		await this.stream_out.close();
	}
	
	/**
	 * Generator that emits a sequence of hydro-index integers.
	 * @param	{number}	width			The number of cells in the x direction in the rainfall radar data,
	 * @param	{number}	height			The number of cells in the y direction in the rainfall radar data,
	 * @param	{number}	scale_factor	The number of times more cells in the heightmap than the rainfall radar data. For example, if the radar data was @ 100m resolution and the heightmap @ 50m, then the scale_factor would be 2.
	 * @return	{Generator}
	 */
	*generate_indices(width, height, scale_factor) {
		// let newlines = 0;
		for(let y = 0; y < height; y++) {
			for(let scale_row_count = 0; scale_row_count < scale_factor; scale_row_count++) {
				// yield `${newlines} | `;
				for(let x = 0; x < width; x++) {
					for(let scale_col_count = 0; scale_col_count < scale_factor; scale_col_count++) {
						yield y*width + x + 1; // Hydro-index values start from 1 apparently (Hello, Lua)
					}
				}
				yield this.symbol_newline;
				// newlines++;
			}
		}
		// console.error(`[HydroIndexWriter/generate_indices] Yielded ${newlines} new lines in total`);
	}
}

export default HydroIndexWriter;
