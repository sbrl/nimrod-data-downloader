"use strict";

import fs from 'fs';

import toml from '@iarna/toml';

/**
 * Reads a pair of TOML configuration files.
 * @param	{string}	file_default	The path to the default configuration file.
 * @param	{string}	file_custom		The path to the custom configuration file.
 * @return	{object}	The parsed settings object.
 */
function toml_settings_read(file_default, file_custom) {
	let obj_default = toml.parse(fs.readFileSync(file_default)),
		obj_custom = toml.parse(fs.readFileSync(file_custom));
	
	obj_apply_recursive(obj_custom, obj_default);
	return obj_default;
}

/**
 * Merges 2 object trees, overwriting keys in target with those of source.
 * Note that target will be mutated!
 * @param  {object} source	The source object to merge.
 * @param  {object} target	The target object to merge.
 */
function obj_apply_recursive(source, target) {
	for(let key in source) {
		if(typeof source[key] == "object") {
			if(typeof target[key] == "undefined")
				target[key] = {};
			
			obj_apply_recursive(source[key], target[key]);
			continue;
		}
		
		target[key] = source[key];
	}
}

export default toml_settings_read;
