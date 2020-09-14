"use strict";

import { promisify } from 'util';

import FtpClient from '@icetee/ftp';

class AsyncFtpClient extends FtpClient {
	constructor() {
		super(...arguments);
		this.listAsync = promisify(this.list);
		this.getAsync = promisify(this.get);
		this.putAsync = promisify(this.put);
		this.appendAsync = promisify(this.append);
		this.renameAsync = promisify(this.rename);
		this.logoutAsync = promisify(this.logout);
		this.deleteAsync = promisify(this.delete);
		this.cwdAsync = promisify(this.cwd);
		this.abortAsync = promisify(this.abort);
		this.siteAsync = promisify(this.site);
		this.statusAsync = promisify(this.status);
		this.asciiAsync = promisify(this.ascii);
		this.binaryAsync = promisify(this.binary);
		this.mkdirAsync = promisify(this.mkdir);
		this.rmdirAsync = promisify(this.rmdir);
		this.cdupAsync = promisify(this.cdup);
		this.pwdAsync = promisify(this.pwd);
		this.systemAsync = promisify(this.system);
		this.listSafeAsync = promisify(this.listSafe);
		this.sizeAsync = promisify(this.size);
		this.lastModAsync = promisify(this.lastMod);
		this.restartAsync = promisify(this.restart);
		this.mlsdAsync = promisify(this.mlsd);
		this.setLastModAsync = promisify(this.setLastMod);
	}
	
	connectAsync(obj) {
		return new Promise((resolve, reject) => {
			this.once("error", reject);

			this.once("ready", () => {
				this.off("error", reject);
				resolve(this);
			});
			
			this.connect(obj);
		});
	}
}
// 
// class AsyncFtpClient extends FtpClient {
// 	constructor() {
// 
// 	}
// 
// 	async connectAsync(obj) {
// 		return new Promise((resolve, reject) => {
// 			this.once("error", reject);
// 
// 			this.once("ready", () => {
// 				this.off("error", reject);
// 				resolve(this);
// 			});
// 		});
// 	}
// 
// 	async listAsync(...args) {
// 		return new Promise((resolve, reject) => {
// 		    this.once("error", reject);
// 			this
// 		});
// 	}
// }

export default AsyncFtpClient;
