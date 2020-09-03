"use strict";

import EventEmitter from 'events';
import child_process from 'child_process';

class GzipChildProcess extends EventEmitter {
	get stdin() { return this.child_process.stdin; }
	get stdout() { return this.child_process.stdout; }
	get stderr() { return this.child_process.stderr; }
	
	constructor(auto_start = true) {
		super();
		
		this.child_process = null;
		
		this.has_exited = false;
		
		if(auto_start)
			this.start();
	}
	
	start() {
		if(this.child_process != null)
			throw new Error("Invalid Operation: Can't start the child process, since it's already been started.");
		
		this.child_process = child_process.spawn(
			"gzip", [], {
				// Pipe stdin + stdout; send error to the parent process
				stdio: [ "pipe", "pipe", "inherit" ]
			}
		);
		this.child_process.on("exit", () => {
			this.has_exited = true;
			this.emit("exit");
		});
		// FUTURE: Perhaps just throwing the error would be a better choice?
		this.child_process.on("error", (error) => {
			this.emit("error", error);
		});
		
	}
	
	/**
	 * Returns a Promise that resolves when the gzip process exits.
	 * If the gzip child process has already exited, then it resolves immediately.
	 * @return	{Promise}
	 */
	async wait_for_exit() {
		if(this.has_exited) return;
		await EventEmitter.once(this, "exit");
	}
}

export default GzipChildProcess;
