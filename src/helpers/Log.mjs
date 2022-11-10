"use strict";

import a from './Ansi.mjs';

const LOG_LEVELS = {
	DEBUG: 0,
	INFO: 1,
	LOG: 2,
	WARN: 4,
	ERROR: 8,
	NONE: 2048
};

/**
 * Provides a simple logging utility. Depends on Ansi.mjs, and originated in my
 * personal project woppleblox (which may or may not actually get finished).
 */
class Log {
	constructor() {
		this.start = new Date();
		
		this.level = LOG_LEVELS.DEBUG;
		this.datetime_relative = false;
	}
	
	
	debug(...message) {
		if(this.level > LOG_LEVELS.DEBUG) return;
		this.__do_log("debug", ...message);
	}
	
	info(...message) {
		if(this.level > LOG_LEVELS.INFO) return;
		this.__do_log("info", ...message);
	}
	
	log(...message) {
		if(this.level > LOG_LEVELS.LOG) return;
		this.__do_log("log", ...message);
	}
	
	warn(...message) {
		if(this.level > LOG_LEVELS.WARN) return;
		this.__do_log("warn", ...message);
	}
	
	error(...message) {
		if(this.level > LOG_LEVELS.ERROR) return;
		this.__do_log("error", ...message);
	}
	
	
	__do_log(level, ...message) {
		let part = `[ ${level} ]`;
		switch(level) {
			case "debug":
				part = a.locol + part;
				message.push(a.reset);
				break;
			case "warn":
				part = a.fyellow + a.hicol + part;
				message.push(a.reset);
				break;
			case "error":
				part = a.fred + a.hicol + part;
				message.push(a.reset);
				break;
		}
		
		let date = this.datetime_relative ? ((new Date() - this.start) / 1000).toFixed(3) : (new Date()).toISOString();
		
		message.unshift(`${part}`);
		message.unshift(`${a.locol}[ ${date} ]${a.reset}`);
		
		console.error(...message);
	}
}

const instance = new Log();
// You won't normally need these
export { LOG_LEVELS, instance as log };

export default instance;
