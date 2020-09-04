"use strict";

class FileDownloader {
	constructor(in_ftpclient) {
		this.ftpclient = in_ftpclient;
	}
	
	async download_many(generator) {
		throw new Error("Not implemented yet");
	}
}

export default FileDownloader;
