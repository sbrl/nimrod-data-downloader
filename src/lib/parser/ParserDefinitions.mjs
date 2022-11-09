"use strict";

import { Parser as BinaryParser } from 'binary-parser';

/**
 * Generates a parser for the header of the Nimrod composite file format.
 * @return {BinaryParser.Parser} The generated parser.
 */
function parser_head() {
	return new BinaryParser()
		.endianess("big")
		.array("arr_int16_a", {
			type: "int16be",
			length: 31
		})
		.array("arr_float_generic", {
			type: "floatbe",
			length: 28
		})
		.array("arr_float_specific", {
			type: "floatbe",
			length: 45
		})
		.string("units",		{ stripNull: true, length: 8, formatter: (str) => str.trim() })
		.string("data_source",	{ stripNull: true, length: 24, formatter: (str) => str.trim() })
		.string("title",		{ stripNull: true, length: 24, formatter: (str) => str.trim() })
		.array("arr_int16_b", {
			type: "int16be",
			length: 51
		});
}

/**
 * Generates a parser for the body of the Nimrod composite file format.
 * Caution: This requires that an existing parsed file is passed to determine 
 * both the data type to parse as from the headers, and the length & structure
 * of the data in question.
 * @param	{Object}	file		The parsed file to generate the parser for.
 * @return	{BinaryParser.Parser}	The generated parser.
 */
function parser_body(file) {
	let datatype = `int${file.header.data_length_bytes * 8}be`;
	return new BinaryParser()
		.endianess("big")
		.array("dataset", {
			type: datatype,
			lengthInBytes: file.data_size,
		});
}

/**
 * Generates a parser for the Nimrod composite binary file format ~v2.6
 * @return {BinaryParser.Parser} The generated parser.
 */
function parser() {
	let parser = new BinaryParser()
		.endianess("big")
		.uint32("header_size", { assert: 512 })
		.nest("header", { type: parser_head() })
		.uint32("header_size_again", { assert: function(value) { return value == this.header_size; } })
		// Potentially an issue on old files? May not be present.
		.uint32("data_size")
		.buffer("data", { length: function() { return this.data_size; } }) // May need to be a regular function
		.uint32("data_size_again", { assert: function(value) { return value == this.data_size; } })
	
	return parser;
}

export { parser as create_parser, parser_body };
export default parser;
