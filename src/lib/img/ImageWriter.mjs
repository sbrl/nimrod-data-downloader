"use strict";

import fs from 'fs';
import path from 'path';

import Terrain50 from 'terrain50';

import l from '../../helpers/Log.mjs';
import normalise from '../2dmanip/normalise.mjs';
import make_image from './make_image.mjs';

class ImageWriter {
	constructor(dir_output) {
		this.dir_output = dir_output;
		this.heightmap = null;
		
		// Ref https://water.usgs.gov/edu/activity-howmuchrain-metric.html
		this.radar_val_min = 0;		// mm/hr
		this.radar_val_max = 50;	// mm/hr; violent shower
	}
	
	/**
	 * Sets up this ImageWriter instance.
	 * @param	{string}	path_heightmap	The path to the heightmap file to load.
	 * @return	{Promise}	Promise that resolves when the setup is complete.
	 */
	async setup(path_heightmap) {
		let heightmap = Terrain50.Parse(
			await fs.promises.readFile(path_heightmap, "utf-8")
		);
		normalise(heightmap.data,
			heightmap.min_value, heightmap_max_value,
			0, 255,
			true,	// Clamp out-of-bounds values
			true	// Round to the nearest int
		);
		this.heightmap = heightmap.data;
	}
	
	/**
	 * Writes all the images in the given stream as PNGs to the previously
	 * specified output directory.
	 * Important: The .data parameter should have ALREADY been transposed!
	 * @param  {Generator<Object>} stream The generator from which objects should be read. It is suggested that RadarReader.iterate() be used for this purpose.
	 * @return {Promise}        A Promise that resolve when the process is complete.
	 */
	async write(stream) {
		for await (let obj of stream) {
			l.log(`[ImageWriter] Encoding ${obj.timestamp}`);
			await this.write_single(obj.data,
				path.join(this.dir_output, `${obj.timestamp}.png`)
			);
		}
	}
	
	/**
	 * Write a single 2D data array as a PNG image to the given filepath.
	 * Channels: alpha (unused; set to 255), red (unused, set to 0), green (heightmap), blue (rainfall radar data).
	 * Note: The data is not auto-transposed.
	 * @param  {number[][]}	arr				The 2D rainfall radar data to encode. Note: This should be transposed!
	 * @param  {string}		filename_dest	The filepath to write the resulting PNG image to.
	 * @return {Promise}	A Promise that resolves when writing is complete.
	 */
	async write_single(arr, filename_dest) {
		normalise(arr,
			this.radar_val_min, this.radar_val_max,
			0, 255,
			true,	// Clamp values
			true	// Round to the nearest int
		);
		let buf_img = make_image(arr, this.heightmap);
		
		await fs.promises.writeFile(filename_dest, buf_img)
	}
}

export default ImageWriter;
