"use strict";

import a from '../../../helpers/Ansi.mjs';

import extract_area from '../../lib/ExtractArea.mjs';

/**
 * Extracts a subsection of the given file.
 * The extraction is done in OS mational grid references with northing + 
 * easting, because the data itself is only rectanluar when presented as such.
 * @param  {Object} settings The settings object.
 * @param  {NimrodFile} file     The file to extract from. See NimrodParser.
 */
export default async function(settings, file) {
	let result = await extract_area(settings, file);
	
	console.log(JSON.stringify(result));
	
	console.error(`Total ${result.count_extract} points, size ${a.hicol}${result.size_extract.width}x${result.size_extract.height}${a.reset} (was ${a.hicol}${result.size_full.width}x${result.size_full.height}${a.reset} with est ${a.hicol}${result.count_total}${a.reset} points)`);
}
