"use strict";

import a from '../../helpers/Ansi.mjs';
import l from '../../helpers/Log.mjs';
import { latlng2os, os2arr } from '../../helpers/CoordinateHelpers.mjs';

/**
 * Extracts a subsection of the given file.
 * The extraction is done in OS mational grid references with northing + 
 * easting, because the data itself is only rectangluar when presented as such.
 * @param	{Object}		bounds	The bounds object.
 * @param	{NimrodFile}	file	The file to extract from. See NimrodParser.
 * @returns	{Object}		An object containing the extracted data and the associated metadata.
 */
export default function(bounds_extract, file) {
	/* bounds_extract format *
	{
		top_left: { latitude: float, longitude: float },
		bottom_right: { latitude: float, longitude: float }
	}
	 */
	// 1: Get bounds
	let bounds_full = file.header.locations_northing_easting;
	
	// This works because if 1 is set, then the others will be too  as we check 
	// these in cli.mjs when we parse the --bounds argument parameter.
	if(typeof bounds_extract.top_left == "undefined" || typeof bounds_extract.top_left.latitude != "number") {
		l.error(`${a.hicol}${a.fred}Error: No extraction area specified.${a.reset}`);
		process.exit(1);
	}
	
	bounds_extract.top_left_os = latlng2os(bounds_extract.top_left.latitude, bounds_extract.top_left.longitude);
	bounds_extract.bottom_right_os = latlng2os(bounds_extract.bottom_right.latitude, bounds_extract.bottom_right.longitude);
	let ex_sides_os = {
		top: bounds_extract.top_left_os.northing,
		bottom: bounds_extract.bottom_right_os.northing,
		left: bounds_extract.top_left_os.easting,
		right: bounds_extract.bottom_right_os.easting
	};
	let arr_size = { width: file.header.fields.x, height: file.header.fields.y };
	
	let start = os2arr(bounds_full, arr_size, ex_sides_os.top, ex_sides_os.left),
		end = os2arr(bounds_full, arr_size, ex_sides_os.bottom, ex_sides_os.right);
	
	// l.debug(`Bounds:`, bounds_full);
	// l.debug(`Array dimensions:`, arr_size);
	// l.debug(`Before swap: start (${start.x}, ${start.y}); end: (${end.x}, ${end.y})`);
	
	if(start.x > end.x)
		[ start.x, end.x ] = [ end.x, start.x ];
	if(start.y > end.y)
		[ start.y, end.y ] = [ end.y, start.y ];
	
	// l.debug(`After swap: start (${start.x}, ${start.y}); end: (${end.x}, ${end.y})`);
	
	let result = [], count = 0;
	for(let y = start.y; y < end.y; y++) {
		let row = [];
		for(let x = start.x; x < end.x; x++) {
			let value = null;
			if(typeof file.data_array[x] == "undefined") {
				l.warn(`${a.hicol}${a.fyellow}Warning: row ${y} doesn't exist!${a.reset}`);
				value = -1;
				continue;
			}
			if(typeof file.data_array[x][y] == "undefined") {
				l.warn(`${a.hicol}${a.fyellow}Warning: value at (${x}, ${y}) doesn't exist!${a.reset}`);
				value = -1;
				continue;
			}
			if(value !== -1)
				value = file.data_array[x][y]
			
			row.push(value);
			count++;
		}
		result.push(row);
	}
	
	if(result.length == 0) {
		l.warn(`Warning: No points or rows found (what's going on here?)`);
		return null;
	}
	
	let timestamp = file.header.time_validity;
	if(!(timestamp instanceof Date))
		timestamp = new Date(timestamp);
	
	return result;
}
