"use strict";

import is_big_endian from '../sys/is_big_endian.mjs';

import encode from 'image-encode';

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
		throw new Error(`Error: The width and height of the rainfall radar and heightmap data don't match! width = ${radar[0].length} / ${heightmap[0].length}; height = ${radar.length} / ${heightmap.length}`);
	
	
	let width = radar[0].length,
		height = radar.length;
	
	let buffer = new ArrayBuffer(width * height * 4),
		buffer32 = new Uint32Array(buffer);
	
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
					(heightmap[y][x]	<< 16) |	// Green → heightmap
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
					(heightmap[y][x]	<< 8) |		// Green → heightmap
					0								// Red (unused)
			}
		}
	}
	
	return encode(buffer, {
		width,
		height,
		format: "png"
	});
}
