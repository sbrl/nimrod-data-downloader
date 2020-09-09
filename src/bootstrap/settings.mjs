"use strict";

import fs from 'fs';
import path from 'path';

const __dirname = import.meta.url.slice(7, import.meta.url.lastIndexOf("/"));

var settings = null;

function load_config_file(loc_settings_custom) {
	let loc_settings_default = `${path.dirname(__dirname)}/settings.default.toml`;
	
	// Create the settings file if it doesn't exist already
	if(!fs.existsSync(loc_settings_custom))
		fs.writeFileSync(loc_settings_custom, `# Custom settings file, created ${new Date().toISOString()}\n`);
	
	return settings_read(
		loc_settings_default,
		loc_settings_custom
	);
}

function get_settings() {
	let result = {
		cli: {
			program_name: "nimrod-data-downloader",
			description: "downloads 1km NIMROD rainfall radar data"
		},
		config: null,
		output: {
			ansi_colour: !(typeof process.env.NO_COLOR == "string")
		},
		package: JSON.parse(fs.readFileSync(
			path.resolve(__dirname, "../../package.json")
		))
	};
	settings = result;
	return result;
}

function load_config(loc_settings_custom) {
	settings.config = load_config_file(loc_settings_custom);
}

get_settings();

export { settings, load_config };
export default settings;
