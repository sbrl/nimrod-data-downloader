"use strict";

import a from '../../../utils/Ansi.mjs';

export default async function(_settings, file) {
	// console.log(file);
	console.error(`${a.hicol}Header:${a.reset}`);
	console.log(file.header);
	console.error(`${a.hicol}Body:${a.reset}`);
	console.log(file.data_array);
}
