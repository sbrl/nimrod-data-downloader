"use strict";

import settings from '../../bootstrap/settings.mjs';
import l from '../../helpers/Log.mjs';

export default async function() {
	// 1: Validation
	if(typeof process.env.NIMROD_CEDA_USER !== "string") {
		l.error(`Error: The environment variable NIMROD_CEDA_USER is not set.`);
		process.exit(1);
	}
	if(typeof process.env.NIMROD_CEDA_PASSWORD !== "string") {
		l.error(`Error: The environment variable NIMROD_CEDA_PASSWORD is not set.`);
		process.exit(1);
	}
	// Validate the bounding box that we want to extract
	if(settings.bounds.top_left.latitude == null) {
		l.error(`Error: The latitude for the top-left corner of the bounds is null.`);
		process.exit(2);
	}
	if(settings.bounds.top_left.longitude == null) {
		l.error(`Error: The longitude for the top-left corner of the bounds is null.`);
		process.exit(2);
	}
	if(settings.bounds.bottom_right.latitude == null) {
		l.error(`Error: The latitude for the bottom-right corner of the bounds is null.`);
		process.exit(2);
	}
	if(settings.bounds.bottom_right.longitude == null) {
		l.error(`Error: The longitude for the bottom-right corner of the bounds is null.`);
		process.exit(2);
	}
	if(typeof settings.config.output != "string" || settings.config.output == "CHANGE_ME") {
		l.error(`Error: No output directory was specified in the config file.`);
		process.exit(2);
	}
	if(typeof settings.config.ftp.url != "string" || settings.config.ftp.url == "CHANGE_ME") {
		l.error(`Error: No ftp url was specified in the config file.`);
		process.exit(2);
	}
	if(typeof settings.config.ftp.username != "string" || settings.config.ftp.username == "CHANGE_ME") {
		l.error(`Error: No ftp username was specified in the config file.`);
		process.exit(2);
	}
	if(typeof settings.config.ftp.password != "string" || settings.config.ftp.password == "CHANGE_ME") {
		l.error(`Error: No ftp password was specified in the config file.`);
		process.exit(2);
	}
	if(settings.cli.blacklist_file instanceof Array) {
		for(let filename of settings.cli.blacklist_file) {
			l.info(`[download/cli] Blacklisting ${a.hicol}${settings.cli.blacklist_file}${a.reset}`);
			settings.config.ftp.blacklist.push(filename);
		}
	}
	
	l.info(`Extraction bounding box`, settings.bounds);
	
	// 2: Initialisations
	let credentials = {
		user: process.env.NIMROD_CEDA_USER,
		password: process.env.NIMROD_CEDA_PASSWORD
	};
	
	let download_manager = new DownloadManager(credentials);
	
	// 3: Run
	await download_manager.setup();
	await download_manager.run();
}
