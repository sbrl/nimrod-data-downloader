"use strict";

import EventEmitter from 'events';

import { ErrorWrapper } from './Errors.mjs';

/**
 * Wraps and tracks the resolution of a Promise returned by an async function.
 * @extends EventEmitter
 */
class PromiseWrapper extends EventEmitter {
	/**
	 * Whether the promise that is being tracked is still pending or not.
	 * Note that if .run() is re-called, the result from the previous execution
	 * is lost.
	 * @return {Boolean}
	 */
	get is_pending() {
		return this.status === "pending";
	}
	/**
	 * Whether the promise that was being tracked has resolved successfully or not.
	 * Note that the promise may still be pending.
	 * @return {Boolean}
	 */
	get is_complete() {
		return this.status === "complete";
	}
	/**
	 * Whether the promise that was being tracked failed or not.
	 * Note that it may not have resolved yet.
	 * @return {Boolean}
	 */
	get is_failed() {
		return this.status === "failed";
	}
	/**
	 * Whether the promise that is being tracked has finished or not.
	 * Note that this may not mean that it completed successfully.
	 * @return {Boolean}
	 */
	get is_finished() {
		return this.status === "complete" || this.status === "failed";
	}
	
	
	constructor(async_func) {
		super();
		
		/** Whether to wrap errors in ErrorWrapper or not. @type {Boolean} */
		this.wrap_errors = true;
		
		/**
		 * The asynchronous (promise-returning) function that will be executed.
		 * @type {Function<Promise>}
		 */
		this.async_func = async_func;
		/**
		 * The status of this promise. Can be either "pending", "complete", or "failed".
		 * May also be null if the async function hasn't been called yet.
		 * @type {string|null}
		 */
		this.status = null;
		/**
		 * The error that was thrown in the last invocation.
		 * @type {Error|null}
		 */
		this.error = null;
	}
	
	/**
	 * Runs the underlying async function, keeping track of it's status.
	 * @param  {...any} args	Optional. The arguments to pass to the function.
	 * @return {[type]}      [description]
	 */
	run(...args) {
		if(this.status == "pending")
			throw new Error("Error: Can't execute async function because an execution is already in progress, and PromiseWrapper can only keep track of 1 execution at a time.\nCreate a new instance of PromiseWrapper if you need to run an async function multiple times at once.");
		
		this.status = "pending";
		this.emit("start");
		return new Promise((resolve, reject) => {
			this.async_func(...args).then((value) => {
					this.status = "complete";
					this.emit("complete", value);
					resolve();
				})
				.catch((error) => {
					let wrapped = new ErrorWrapper(`[PromiseWrapper] Error: Promise rejected with an error.`, error);
					this.status = "failed";
					this.error = wrapped;
					this.emit("error", wrapped);
					reject(wrapped);
				});
		});
	}
}

export default PromiseWrapper;
