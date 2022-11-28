"use strict";

import path from 'path';
import { fork } from 'child_process';
import { once, EventEmitter } from 'events';

import a from '../../helpers/Ansi.mjs';
import log from '../../helpers/NamespacedLog.mjs';import sleep_async from '../async/Sleep.mjs';
 const l = log("ftp:parent");

const __dirname = import.meta.url.slice(7, import.meta.url.lastIndexOf("/"));


class FtpChildProcessClient extends EventEmitter {
	
	#connect_args = null;
	#next_req_id = 0;
	
	constructor() {
		super();
		
		this.disconnect_timeout = 10 * 1000;
		
		this.child_abort = null;
		this.child = null;
		this.#make_child();
		
		this.paused = false;
		this.doing_reconnect = false;
		
		this.reconnect_delay = 30 * 1000;
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
		// l.info(`message: event`, message.event, `req_id`, message.req_id);
		switch(message.event) {
			case "ipc-connect":
				this.emit("ipc-connect", { req_id: message.req_id });
				break;
			case "ipc-list":
				this.emit("ipc-list", { req_id: message.req_id, result: message.result });
				break;
			case "ipc-download":
				this.emit("ipc-download", { req_id: message.req_id });
				break;
			default: // We don't have an entry for ipc-disconnect since that cuts the ipc connection
				l.warn(`Ignoring message with unknown event '${message.event}'.`);
				break;
		}
	}
	
	#wait_for_req_id(event_name, req_id, abort_signal) {
		return new Promise((resolve, reject) => {
			// l.log(`wait_for_req_id: ${a.hicol}${a.fcyan}START${a.reset} event_name`, event_name, `req_id`, req_id);
			const handle_event = (obj) => {
				if(obj instanceof Array) obj = obj[0];
				if(obj.req_id !== req_id) {
					// if(obj.req_id !== null) l.info(`wait_for_req_id: ${a.locol}${a.fyellow}IGNORE${a.reset} ${a.fmagenta}req_id${a.reset}`, obj.req_id);
					// Nope, listen for the next one
					// We have to do it like this, because otherwise we can't use an AbortController, which is required for our use case
					once(this, event_name, { signal: abort_signal }).then(handle_event).catch(handle_error);
					return;
				}
				this.off(event_name, handle_event);
				this.child.off("error", handle_error);
				// l.info(`wait_for_req_id: ${a.fgreen}EXIT_COMPLETE${a.reset} ${a.fmagenta}req_id${a.reset}`, obj.req_id);
				resolve(obj.result);
			}
			const handle_error = (error) => {
				// this.off(event_name, handle_event);
				l.warn(`wait_for_req_id: EXIT_ERROR`);
				reject(error);
			}
			
			this.child.once("error", handle_error);
			// Kick off the initial once() call
			handle_event({ req_id: null });
		});
	}
	
	async #do_ipc_call(event_name, args) {
		while(true) {
			const req_id = this.#next_req_id++;
			const abort = new AbortController();
			let did_crash = false;
			const handle_crash = () => {
				did_crash = true;
				abort.abort();
			};
			this.child.send({
				event: event_name,
				req_id,
				args
			});
			this.child.on("error", handle_crash);
			let result;
			try {
				result = await this.#wait_for_req_id(event_name, req_id, abort.signal);
			}
			catch(error) {
				l.warn(`do_ipc_call: Caught error:`, error);
				did_crash = true;
			}
			this.child.off("error", handle_crash);
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
	
	async force_reconnect() {
		if(!this.doing_reconnect) {
			l.info(`force_reconnect: reconnect requested, but one is already in progress`);
			return;
		}
		this.doing_reconnect = true;
		
		l.info(`force_reconnect: disconnecting [1/4]`)
		await this.disconnect();
		
		l.info(`force_reconnect: creating new child process [2/4]`)
		this.#make_child();
		
		l.info(`force_reconnect: waiting ${this.reconnect_delay}ms reconnect delay [2/4]`)
		await sleep_async(this.reconnect_delay);
		
		l.info(`force_reconnect: connecting new child process [2/4]`);
		await this.connect();
		l.info(`force_reconnect: complete`);
		
		this.doing_reconnect = false;
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
				this.child = null;
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