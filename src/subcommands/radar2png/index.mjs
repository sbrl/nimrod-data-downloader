"use strict";

import fs from 'fs';

import settings from '../../bootstrap/settings.mjs';
import l from '../../helpers/Log.mjs';
import a from '../../helpers/Ansi.mjs';

import ImageWriter from '../../lib/img/ImageWriter.mjs';
import RadarReader from '../../lib/RadarReader.mjs';

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
	if(!fs.existsSync(settings.cli.output))
		await fs.promises.mkdir(settings.cli.output, { recursive: true, mode: 0o750 });
	
	let reader = new RadarReader();
	let writer = new ImageWriter(settings.cli.output);
	
	await writer.setup(settigs.cli.heightmap);
	await writer.write(reader.iterate(settings.cli.input));
}
