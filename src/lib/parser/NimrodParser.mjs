"use strict";

import { create_parser, parser_body } from './ParserDefinitions.mjs';
import { enum_flags_parse } from '../../helpers/EnumHelpers.mjs';
import { os2latlng } from '../../helpers/CoordinateHelpers.mjs';

class NimrodParser {
	constructor() {
		this.parser = create_parser();
		
		this.data_type = {
			0: "real",
			1: "int",
			2: "byte"
		};
		this.grid_type_horizontal = {
			0: "NG",
			1: "lat-lon",
			2: "space view",
			3: "polar stereographic",
			4: "UTM32 (EuroPP)",
			5: "Rotated Lat Lon",
			6: "other"
		};
		this.coord_vertical_type = {
			0: "height above orography",
			1: "height above sea-level",
			2: "pressure",
			3: "sigma",
			4: "eta",
			5: "radar beam number",
			6: "temperature",
			7: "potential temperature",
			8: "equivalent potential temperature",
			9: "wet bulb potential temperature",
			10: "potential vorticity",
			11: "cloud boundary",
			12: "levels below ground"
		};
		this.origin_location = {
			0: "top-left",
			1: "bottom-left",
			2: "top-right",
			3: "bottom-right"
		};
		this.projection = {
			0: "Airy 1830 (NG)",
			1: "International 1924 (modified UTM-32)",
			2: "GRS80 (GUGiK 1992/19)"
		};
		this.origin_model_id = {
			1: "nowcast",
			2: "radar",
			11: "UKV",
			12: "UK4",
			13: "NAE",
			14: "Global",
			15: "MOGREPS-EU",
			16: "MOGREPS-UK",
			17: "UK4-extended",
			18: "4km Italy UM"
		};
		this.time_averaging_mode = {
			1: "warm bias applied",
			2: "cold bias applied",
			4: "smoothed",
			8: "only observations used",
			16: "averaged over multiple surface types",
			32: "scaled to UM resolution (e.g. winds)",
			128: "accumulation or average",
			256: "extrapolation",
			512: "time-lagged",
			4096: "minimum in period",
			8192: "maximum in period"
		};
		this.calibration_type = {
			0: "uncalibrated",
			1: "frontal",
			2: "showers",
			3: "rain shadow",
			4: "bright band",
			"-1": "frontal (removed)",
			"-2": "showers (removed)",
			"-3": "rain shadow (removed)",
			"-4": "bright band (removed)"
		};
	}
	
	parse(buffer) {
		let result = this.parser.parse(buffer);
		
		// Convenience variables
		let int16_a = result.header.arr_int16_a;
		let float_gen = result.header.arr_float_generic;
		let float_spec = result.header.arr_float_specific;
		let int16_b = result.header.arr_int16_b;
		
		// Parse out the header content
		result.header.time_validity = new Date(
			int16_a[0],	// Year
			int16_a[1]  - 1,	// Month (values are from 1 - 12; JS takes 0 - 11)
			int16_a[2],	// Day
			int16_a[3],	// Hour
			int16_a[4],	// Minute
			int16_a[5],	// Second
		);
		result.header.time_data = new Date(
			int16_a[6],	// Year
			int16_a[7] - 1,	// Month (values are from 1 - 12; JS takes 0 - 11)
			int16_a[8],	// Day
			int16_a[9],	// Hour
			int16_a[10],	// Minute
			0,	// Second
		);
		result.header.data_type = this.data_type[int16_a[11]];
		result.header.data_length_bytes = int16_a[12];
		
		// if(int16_a[13] % 4 !== 0)
		// 	throw new Error("Error: The experiment number was not a multiple of 4.");
		
		result.header.experiment_number = int16_a[13];
		result.header.grid_type_horizontal = this.grid_type_horizontal[int16_a[14]];
		result.header.fields = {
			x: int16_a[15], rows: int16_a[15],
			y: int16_a[16], cols: int16_a[16]
		};
		result.header.header_file_release = int16_a[17];
		// See Appendix A in the file format spec as to what the field code 
		// means. In the case of rainfall radar data that I'm using,
		// 213 = Precipitation rate with a filename tag of 'precip'.
		result.header.field_code = int16_a[18];
		result.header.coord_vertical_type = this.coord_vertical_type[int16_a[19]];
		// NOTE: This one may not be quite right
		result.header.coord_vertical_reference_level = this.coord_vertical_type[int16_a[20]];
		result.header.count_reals_specific = int16_a[21];
		result.header.count_int16_b_specific = int16_a[22];
		result.header.origin_location = this.origin_location[int16_a[23]];
		result.header.missing_data_value_int = int16_a[24]; // ???
		result.header.period_of_interest_mins = int16_a[25];
		result.header.period_of_interest_real_mode = int16_a[25] == +32767 ? "seconds" : "minutes";
		result.header.model_levels = int16_a[26];
		result.header.projection = this.projection[int16_a[27]];
		result.header.ensemble_member_id = int16_a[28];
		result.header.origin_model_id = this.origin_model_id[int16_a[29]];
		result.header.time_averaging_mode = enum_flags_parse(
			int16_a[30],
			this.time_averaging_mode
		);
		
		// --------------------------------------------------------------------
		
		result.header.coord_vertical_value = float_gen[0];
		result.header.coord_vertical_reference_value = float_gen[1];
		result.header.origin = os2latlng(float_gen[2], float_gen[4]);
		result.header.interval = {
			row: float_gen[3],
			col: float_gen[5]
		};
		result.header.missing_data_value_real = float_gen[6];	// ???
		result.header.scaling_factor_mks = float_gen[7];	// 100 = pressure in millibars
		result.header.data_offset_value = float_gen[8];
		result.header.grid_offset = {
			x: float_gen[9],
			y: float_gen[10]
		};
		result.header.origin_location_true = {
			latlng: os2latlng(float_gen[11], float_gen[12]),
			northing: float_gen[11],
			easting: float_gen[12],
			easting_proj_tm: float_gen[13],
			northing_proj_tm: float_gen[14]
		};
		result.header.scale_factor_central_meridian = float_gen[15];
		result.header.threshold_value = float_gen[16];
		result.header.general_header_values = float_gen.slice(17, 27); // ???
		
		// --------------------------------------------------------------------
		
		result.header.locations_northing_easting = {
			top_left: { northing: float_spec[0], easting: float_spec[1] },
			top_right: { northing: float_spec[2], easting: float_spec[3] },
			bottom_right: { northing: float_spec[4], easting: float_spec[5] },
			bottom_left: { northing: float_spec[6], easting: float_spec[7] },
			
			top: float_spec[0],
			bottom: float_spec[4],
			left: float_spec[1],
			right: float_spec[5]
		};
		if(Math.floor(float_spec[0]) == -32767 &&
			Math.floor(float_spec[1]) == -32767 &&
			Math.floor(float_spec[2]) == -32767 &&
			Math.floor(float_spec[3]) == -32767 &&
			Math.floor(float_spec[4]) == -32767 &&
			Math.floor(float_spec[5]) == -32767 &&
			Math.floor(float_spec[6]) == -32767 &&
			Math.floor(float_spec[7]) == -32767) {
			// It's a weird old non-standard format - infer the bounding box
			
			result.header.locations_northing_easting.bottom = float_gen[2];
			result.header.locations_northing_easting.right = float_gen[4];
			// FUTURE: If things seem off, it's probably because the scanlines aren't going in the direction we thought they did, and we've inferred the bounding box incorrectly.
			// This calculation fot he bounding box assumes that the data is organised in rows that are horizontal, and that there are a given number of columns in each row.
			result.header.locations_northing_easting.top = 
				float_gen[2] - float_gen[3]*result.header.fields.rows;
			result.header.locations_northing_easting.left = 
				float_gen[4] + float_gen[5]*result.header.fields.cols;
			
			result.header.locations_northing_easting.top_left.northing = result.header.locations_northing_easting.top;
			result.header.locations_northing_easting.top_left.easting = result.header.locations_northing_easting.left;
			
			result.header.locations_northing_easting.top_right.northing = result.header.locations_northing_easting.top;
			result.header.locations_northing_easting.top_right.easting = result.header.locations_northing_easting.right;
			
			result.header.locations_northing_easting.bottom_right.northing = result.header.locations_northing_easting.bottom;
			result.header.locations_northing_easting.bottom_right.easting = result.header.locations_northing_easting.right;
			
			result.header.locations_northing_easting.bottom_left.northing = result.header.locations_northing_easting.bottom;
			result.header.locations_northing_easting.bottom_left.easting = result.header.locations_northing_easting.left;
		}
		result.header.locations = {
			top_left: os2latlng(float_spec[0], float_spec[1]),
			top_right: os2latlng(float_spec[2], float_spec[3]),
			bottom_right: os2latlng(float_spec[4], float_spec[5]),
			bottom_left: os2latlng(float_spec[6], float_spec[7])
		};
		result.header.satellite_calibration_coefficient = float_spec[8];
		result.header.space_count = float_spec[9];
		result.header.ducting_index = float_spec[10];
		result.header.elevation_angle = float_spec[11];
		result.header.neighbourhood_size_km = float_spec[12];
		result.header.radius_of_interest_km = float_spec[13];
		result.header.recursive_filter_strength_alpha = float_spec[14];
		result.header.fuzzy_threshold_param = float_spec[15];
		result.header.fuzzy_duration = float_spec[16];
		result.header.spare_real_spec = float_spec.slice(17);
		
		// --------------------------------------------------------------------
		
		this.parse_float_spec_radar(int16_b, result);
		// Parts of int16_b can also be parsed in other modes, but is not done 
		// so here.
		// 
		// Other modes:
		//  - Probability-specific entries (when element 48 is set)
		//  - Tile surface specifications
		//  - Radiation type specifications
		// See the original spec document for more information.
		
		// --------------------------------------------------------------------
		
		result.data_array = this.parse_data(result);
		
		return result;
	}
	
	parse_float_spec_radar(int16_b, result) {
		result.header.radar_number = int16_b[0]; // 0 = It's a composite
		result.header.radar_sites_composite_flags = int16_b[1];
		result.header.radar_sites_composite_flags_additional = int16_b[2];
		result.header.clutter_map_number = int16_b[3];
		result.header.calibration_type = this.calibration_type[int16_b[4].toString()];
		result.header.bright_band_height = int16_b[5];
		result.header.bright_band_intensity = int16_b[6];
		result.header.bright_band_test_param_1 = int16_b[7];
		result.header.bright_band_test_param_2 = int16_b[8];
		result.header.infill_flag = int16_b[9];
		result.header.cosmos = int16_b.slice(10, 10 + 13 + 8);
		result.header.identifier_sensor = int16_b[32];
		result.header.identifier_meteosat = int16_b[33];	//  Apparently 5 or 6 at the moment
		result.header.availability_alpha_flags = int16_b[34];
		result.header.period_of_interest_real = int16_b[50];
	}
	
	parse_data(file) {
		file.data_array = [];
		
		if(file.header.data_type !== "int") {
			console.error(`Error: Unknown data type '${file.header.data_type}'.`)
			process.exit(4);
		}
		
		let parser = parser_body(file);
		let int_array = parser.parse(file.data).dataset;
		let result = [];
		
		// Split the data up into a 2D array
		for(let i = 0; i < file.header.fields.rows; i++) {
			let next_slice = int_array.slice(
				i * file.header.fields.cols,
				i * file.header.fields.cols + file.header.fields.cols,
			)
			// Ensure no values are below 0, and divide by 32 (the data is in mm/hr*32)
			// Ref: Email from Josh 2020-06-30
			result.push(next_slice.map((el) => Math.max(el / 32, 0)));
		}
		
		return result;
	}
	
	/**
	 * Cleans up a given file object and removes unnecessary properties.
	 * This can be useful just before serialisation to disk to save space.
	 * Note that the object passed as an argument is mutated!
	 * @param  {Object} file_obj  The object to clean up.
	 * @param  {Number} [level=1] How much to clean it. Higher numbers mean more cleaning. Set to 0 to bve more conservative. Default: 1. The max is currently 2.
	 */
	clean(file_obj, level = 1) {
		delete file_obj.data;
		delete file_obj.data_size_again;
		delete file_obj.header_size_again;
		delete file_obj.header.arr_int16_a;
		delete file_obj.header.arr_float_generic;
		delete file_obj.header.arr_float_specific;
		delete file_obj.header.arr_int16_b;
		
		if(level > 0) {
			delete file_obj.header.general_header_values;
			delete file_obj.header.spare_real_spec;
			delete file_obj.header.cosmos;
		}
		
		if(level > 1) {
			delete file_obj.header.fields.x;
			delete file_obj.header.fields.y;
		}
	}
}

export default NimrodParser;
