"use strict";

import fs from 'fs';

import settings from '../../bootstrap/settings.mjs';
import l from '../../helpers/Log.mjs';
import a from '../../helpers/Ansi.mjs';

import DownloadManager from '../../lib/download/DownloadManager.mjs';

export default async function() {
	if(settings.cli.output) settings.config.output = settings.cli.output;
	
	// 1: Validation
	if(typeof process.env.NIMROD_CEDA_USER !== "string" && settings.config.ftp.username == "CHANGE_ME") {
		l.error(`Error: The environment variable NIMROD_CEDA_USER is not set.`);
		process.exit(1);
	}
	if(typeof process.env.NIMROD_CEDA_PASSWORD !== "string" && settings.config.ftp.password == "CHANGE_ME") {
		l.error(`Error: The environment variable NIMROD_CEDA_PASSWORD is not set.`);
		process.exit(1);
	}
	// Validate the bounding box that we want to extract
	if(typeof settings.bounds == "undefined" || settings.bounds == null) {
		l.warn(`Warning: The latitude and longitude for the top-left corner of the bounds are not specified, so no area extraction will be performed.`);
		settings.bounds = null;
	}
	if(settings.bounds) {
		if(typeof settings.bounds.top_left == "undefined") {
			l.warn(`Warning: The latitude and longitude for the top-left corner of the bounds are not specified, so no area extraction will be performed.`);
			settings.bounds = null;
		}
		else {
			if(settings.bounds.top_left.latitude == null) {
				l.warn(`Warning: The latitude for the top-left corner of the bounds is null, so no area extraction will be performed.`);
				settings.bounds = null;
			}
			if(settings.bounds.top_left.longitude == null) {
				l.warn(`Warning: The longitude for the top-left corner of the bounds is null, so no area extraction will be performed.`);
				settings.bounds = null;
			}
		}
		if(typeof settings.bounds.bottom_right == "undefined") {
			l.warn(`Warning: The latitude and longitude for the bottom-right corner of the bounds are not specified, so no area extraction will be performed.`);
			settings.bounds = null;
		}
		else {
			if(settings.bounds.bottom_right.latitude == null) {
				l.warn(`Warning: The latitude for the bottom-right corner of the bounds is null, so no area extraction will be performed.`);
				settings.bounds = null;
			}
			if(settings.bounds.bottom_right.longitude == null) {
				l.warn(`Warning: The longitude for the bottom-right corner of the bounds is null, so no area extraction will be performed.`);
				settings.bounds = null;
			}
		}
	}
	
	// Validate the other settings
	if(typeof settings.config.output != "string" || settings.config.output == "CHANGE_ME") {
		l.error(`Error: No output directory was specified in the config file.`);
		process.exit(1);
	}
	if(typeof settings.config.ftp.url != "string" || settings.config.ftp.url == "CHANGE_ME") {
		l.error(`Error: No ftp url was specified in the config file.`);
		process.exit(1);
	}
	if(typeof settings.config.ftp.username != "string" || settings.config.ftp.username == "CHANGE_ME") {
		l.error(`Error: No ftp username was specified in the config file.`);
		process.exit(1);
	}
	if(typeof settings.config.ftp.password != "string" || settings.config.ftp.password == "CHANGE_ME") {
		l.error(`Error: No ftp password was specified in the config file.`);
		process.exit(1);
	}
	if(settings.cli.blacklist_file instanceof Array) {
		for(let filename of settings.cli.blacklist_file) {
			l.info(`[download/cli] Blacklisting ${a.hicol}${settings.cli.blacklist_file}${a.reset}`);
			settings.config.ftp.blacklist.push(filename);
		}
	}
	
	if(settings.cli.verbose)
		l.info(`Extraction bounding box`, settings.bounds);
	
	// 2: Initialisations
	if(typeof settings.config.ftp.username !== "string")
		settings.config.ftp.username = process.env.NIMROD_CEDA_USER;
	if(typeof settings.config.ftp.password !== "string")
		settings.config.ftp.password = process.env.NIMROD_CEDA_PASSWORD;
		
	let download_manager = new DownloadManager();
	
	// 3: Run
	await download_manager.setup();
	await download_manager.run();
	
	l.log(`Download complete!`);
	l.log(`Files downloaded to ${a.fgreen}${a.hicol}${settings.config.output}${a.reset}`);
	l.log(`Please cd to the above directory and run the ${a.fgreen}${a.hicol}postprocess.sh${a.reset} script that has been written to that directory to finalise the download.`);
	process.exit();
}
