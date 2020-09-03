"use strict";

function enum_flags_parse(value, definition) {
	let result = [];
	for(let flag in definition) {
		if(value & parseInt(flag) == 1)
			result.push(definition[flag]);
	}
	return result;
};

export { enum_flags_parse };
