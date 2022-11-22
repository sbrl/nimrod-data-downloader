"use strict";

import path from 'path';
import { fork } from 'child_process';
import { once, EventEmitter } from 'events';


import log from '../../helpers/NamespacedLog.mjs'; const l = log("ftp:parent");

const __dirname = import.meta.url.slice(7, import.meta.url.lastIndexOf("/"));


class FtpChildProcessClient extends EventEmitter {
	
	#connect_args = null;
	
	constructor() {
		super();
		
		this.disconnect_timeout = 10 * 1000;
		
		this.child_abort = null;
		this.child = null;
		__make_child();
		
		this.paused = false;
	}
	
	#make_child() {
		this.child_abort = new AbortController();
		this.child = fork(path.join(__dirname, "ftp_child_process.mjs"), {
			stdio: [ 'ignore', 'inherit', 'inherit', 'ipc' ],
			signal: this.child_abort.signal
		});
		this.child.on("message", this.#handle_message.bind(this));
		this.child.once("error", this.#handle_error.bind(this));
	}
	
	async #handle_error(error) {
		this.paused = true;
			
		l.warn(`Caught error`, error);
		
		this.#make_child();
		
		if(this.#connect_args !== null) {
			l.log(`handle_close: reconnecting`);
			await this.connect(
				this.#connect_args.ftp_url,
				this.#connect_args.user,
				this.#connect_args.password
			);
		}
		this.paused = false;
		this.emit("resume");
	}
	
	#handle_message(message) {
		// message is auto deserialised for us
		switch(message.event) {
			case "ipc-connect":
				this.emit("ipc-connect");
			case "ipc-list":
				this.emit("ipc-list", message.result);
			case "ipc-download":
				this.emit("ipc-download");
			default: // We don't have an entry for ipc-disconnect since that cuts the ipc connection
				l.warn(`Ignoring message with unknown event '${message.event}'.`);
				break;
		}
	}
	
	async #do_ipc_call(event, args) {
		while(true) {
			const abort = new AbortController();
			const did_crash = false;
			const handle_crash = () => {
				did_crash = true;
				abort.abort();
			};
			this.child.send({
				event,
				args
			});
			this.child.on("error", handle_crash);
			const result = await once(this, event, { signal: abort.signal });
			if(did_crash) {
				if(this.paused) await once(this, "resume");
				continue;
			}
			return result;
		}
	}
	
	async connect(ftp_url, user, password) {
		this.#connect_args = { ftp_url, user, password };
		return this.#do_ipc_call("ipc-connect", { ftp_url, user, password });
	}
	
	async list(dirpath) {
		return this.#do_ipc_call("ipc-list", { dirpath });
	}
	
	async download(filepath_remote, filepath_local) {
		return this.#do_ipc_call("ipc-download", { filepath_remote, filepath_local });
	}
	
	
	disconnect() {
		return new Promise((resolve, _reject) => {
			let is_done = false;
			const do_graceful = () => {
				if(is_done) return;
				this.child.disconnect();
				this.child = null;
				is_done = true;
				resolve();
			};
			const do_kill = () => {
				if(is_done) return;
				this.child_abort.abort();
				is_done = true;
				resolve();
			}
			this.child.send("req-disconnect");
			once(this, "resp-disconnect").then(do_graceful);
			setTimeout(do_kill, this.disconnect_timeout);
		});
	}
}

export default FtpChildProcessClient;