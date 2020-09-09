"use strict";

import fs from 'fs';
import path from 'path';

import TOML from '@iarna/toml';

import CliParser from 'applause-cli';

import a from '../helpers/Ansi.mjs';
import { settings, load_config } from './settings.mjs';


const __dirname = import.meta.url.slice(7, import.meta.url.lastIndexOf("/"));

const subcommand_directory = "../subcommands";

async function get_actions() {
	let dirs = await fs.promises.readdir(
		path.resolve(
			__dirname,
			subcommand_directory
		)
	);
	return dirs.map((dir) => {
		let index_file = path.resolve(__dirname, `${subcommand_directory}/${dir}/`, "index.mjs");
		if(!fs.existsSync(index_file))
			return null;
		
		return path.basename(path.dirname(index_file));
	}).filter(x => x !== null);
}

async function get_actions_metadata() {
	let result = {};
	for (let action of await get_actions()) {
		let filepath = path.resolve(
			__dirname,
			`${subcommand_directory}/${action}/`,
			`meta.toml`
		);
		if(!fs.existsSync(filepath)) {
			result[action] = {
				description: `${a.locol}${a.italics}(No description found)${a.reset}`,
				arguments: []
			};
			continue;
		}
		
		result[action] = TOML.parse(await fs.promises.readFile(filepath));
	}
	return result;
}

export default async function() {
	let cli = new CliParser(path.resolve(__dirname, "../../package.json"));
	cli.argument("verbose", "Enable verbose mode.", false, "boolean");
	cli.argument("config", "Path to the config file to use (default: settings.custom.toml in the current directory)", "./settings.custom.toml", "string");
	
	cli.argument("bounds-topleft",
		"(download, extract-area) The top-left corner of the bounding box to extract in the form 'latitude,longitude'",
		[null, null], (value) => value.split(",").map(parseFloat)
	);
	cli.argument("bounds-bottomright",
		"(download, extract-area) The bottom-right corner of the bounding box to extract in the form 'latitude,longitude'",
		[null, null], (value) => value.split(",").map(parseFloat)
	);
	
	// Disable ansi escape codes if requested
	if(!settings.output.ansi_colour) {
	    a.enabled = false;
	    a.escape_codes();
	}
	
	let actions_meta = await get_actions_metadata();
	for(let action in actions_meta) {
		let subcommand = cli.subcommand(action, actions_meta[action].description);
		if(!(actions_meta[action].arguments instanceof Array))
			continue;
		for(let argument of actions_meta[action].arguments) {
			subcommand.argument(
				argument.name,
				argument.description,
				argument.default_value,
				argument.type
			);
		}
	}
	
	// 2: CLI Argument Parsing
	
	settings.cli = cli.parse(process.argv.slice(2));
	
	load_config(settings.cli.config);
	
	// Parse the bounds into something that ExtractArea can take
	settings.bounds = settings.config.parsing.bounds;
	
	if(typeof settings.cli.bounds_topleft != "undefined") {
		if(typeof settings.cli.bounds_topleft[0] == "number")
			settings.bounds.top_left.latitude = settings.cli.bounds_topleft[0];
		if(typeof settings.cli.bounds_topleft[1] == "number")
			settings.bounds.top_left.longitude = settings.cli.bounds_topleft[1]
	}
	if(typeof settings.cli.bounds_bottomright != "undefined") {
		if(typeof settings.cli.bounds_bottomright[0] == "number")
			settings.bounds.bottom_right.latitude = settings.cli.bounds_bottomright[0];
		if(typeof settings.cli.bounds_bottomright[1] == "number")
			settings.bounds.bottom_right.longitude = settings.cli.bounds_bottomright[1]
	}
	
	let action = cli.current_subcommand;
	
	if(action == null) {
		console.error(`${a.hicol}${a.fred}Error: No subcommand specified (try --help for usage information).${a.reset}`);
		return;
	}
	
	// 3: Environment Variable Parsing
	
	// process.env.XYZ
	
	
	// 4: Run
	console.error(`${a.fgreen}***** ${a.hicol}${action}${a.reset}${a.fgreen} *****${a.reset}`);
	
	try {
		await (await import(`${subcommand_directory}/${action}/index.mjs`)).default();
	}
	catch(error) {
		console.error(`\n\n`);
		if(settings.cli.verbose) {
			console.error(`${a.fred}${a.hicol}${error}${a.reset}`);
		}
		else {
			console.error(`${a.fred}${a.hicol}${error.message}${a.reset}`);
		}
		process.exit(1);
		throw error;
	}
	
	// 5: Cleanup
	
	
}
