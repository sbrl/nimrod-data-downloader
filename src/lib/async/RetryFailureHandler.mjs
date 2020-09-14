"use strict";

import l from '../../helpers/Log.mjs';
import sleep_async from './Sleep.mjs';

function make_on_failure_handler(tag, delay_ms) {
	return async function(error) {
		l.error(tag, `Encountered error, retrying in ${delay_ms}ms`, error);
		await sleep_async(delay_ms);
	}
}

export default make_on_failure_handler;
