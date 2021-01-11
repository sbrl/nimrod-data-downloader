"use strict";

import fs from 'fs';

import settings from '../../bootstrap/settings.mjs';
import l from '../../helpers/Log.mjs';
import a from '../../helpers/Ansi.mjs';

export default async function() {
	if(typeof settings.cli.input !== "string") {
		l.error("Error: No input directory specified (try --input path/to/nimrod_ceda.jsonl.gz)");
		process.exit(1);
	}
	if(typeof settings.cli.output !== "string") {
		l.error("Error: No output directory specified (try --output path/to/directory)");
		process.exit(1);
	}
	if(typeof settings.cli.heightmap !== "string") {
		l.error("Error: No heightmap specified (try --heightmap path/to/heightmap.asc)");
		process.exit(1);
	}
	
	
	if(!fs.existsSync(settings.cli.heightmap)) {
		l.error(`Error: The heightmap file ${settings.cli.heightmap} doesn't exist.`);
		process.exit(1);
	}
	if(!fs.existsSync(settings.cli.input)) {
		l.error(`Error: The input directory ${settings.cli.input} does not exist.`);
		process.exit(1);
	}
}
