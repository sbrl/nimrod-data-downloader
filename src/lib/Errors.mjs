"use strict";

class ErrorWrapper extends Error {
	constructor(message, inner_exception) {
		super(message);
		this.inner_exception = inner_exception;
	}
	
	toString() {
		return `${super.toString()}\n***Inner Exception ***\n${this.inner_exception}`;
	}
}

export { ErrorWrapper };
