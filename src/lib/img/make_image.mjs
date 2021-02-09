"use strict";

import encode from 'image-encode';

import is_big_endian from '../sys/is_big_endian.mjs';
import l from '../../helpers/Log.mjs';

/**
 * Makes a PNG image given the rainfall radar 2D array and the heightmap - also
 * as a 2D array.
 * Warning: assumes the data has been **PRE NORMALISED** to be between 0 and 255!
 * This is because we rescale to between 0 and 255 when reednering the image.
 * @param  {number[][]} radar     The rainfall radar data to render to PNG.
 * @param  {number[][]} heightmap The heightmap, also as a 2D array
 * @return {[type]}           [description]
 */
export default function(radar, heightmap) {
	if(radar.length !== heightmap.length || radar[0].length !== heightmap[0].length)
		throw new Error(`The width and height of the rainfall radar (${radar[0].length} x ${radar.length}) and the heightmap data (${heightmap[0].length} x ${heightmap.length}) don't match!`);
	
	
	let width = radar[0].length,
		height = radar.length;
	
	let buffer = new ArrayBuffer(width * height * 4),
		buffer32 = new Uint32Array(buffer);
	
	let should_hide_heightmap = typeof process.env.HIDE_HEIGHTMAP == "string";
	if(should_hide_heightmap) l.debug(`Hiding heightmap`);
	
	/*
	When manipulating Uint32s in JS TypedArrays, one needs to be careful of
	endianness.
	Source: https://hacks.mozilla.org/2011/12/faster-canvas-pixel-manipulation-with-typed-arrays/
	 */
	if(is_big_endian()) {
		for(let y = 0; y < height; y++) {
			for(let x = 0; x < width; x++) {
				// Little endian processors
				buffer32[y*width + x] = 
					(0					<< 24) |	// Red (unused)
					(should_hide_heightmap ? 0 : heightmap[y][x]	<< 16) |	// Green → heightmap
					(radar[y][x]		<< 8) |		// Blue → rainfall radar data
					255								// Alpha
			}
		}
	}
	else {
		for(let y = 0; y < height; y++) {
			for(let x = 0; x < width; x++) {
				// Little endian processors
				buffer32[y*width + x] = 
					(255				<< 24) |	// Alpha
					(radar[y][x]		<< 16) |	// Blue → rainfall radar data
					(should_hide_heightmap ? 0 : [y][x]	<< 8) |		// Green → heightmap
					0								// Red (unused)
			}
		}
	}
	
	return new Uint8ClampedArray(encode(buffer, {
		width,
		height,
		format: "png"
	}));
}
