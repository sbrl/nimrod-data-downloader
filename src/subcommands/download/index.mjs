"use strict";

import settings from '../../bootstrap/settings.mjs';

export default async function() {
	if(typeof process.env.NIMROD_CEDA_USER !== "string") {
		l.error(`Error: The environment variable NIMROD_CEDA_USER is not set.`);
		process.exit(1);
	}
	if(typeof process.env.NIMROD_CEDA_PASSWORD !== "string") {
		l.error(`Error: The environment variable NIMROD_CEDA_PASSWORD is not set.`);
		process.exit(1);
	}
	
	let credentials = {
		user: process.env.NIMROD_CEDA_USER,
		password: process.env.NIMROD_CEDA_PASSWORD
	};
	
	let download_manager = new DownloadManager(settings, credentials);
	
	await download_manager.setup();
	await download_manager.run();
}
