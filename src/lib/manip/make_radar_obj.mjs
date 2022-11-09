"use strict";


export default function make_radar_obj(file, data, bounds_extract=null) {
	let bounds_full = file.header.locations_northing_easting;
	let arr_size = { width: file.header.fields.x, height: file.header.fields.y };
	
	let timestamp = file.header.time_validity;
	if(!(timestamp instanceof Date))
		timestamp = new Date(obj.timestamp);
	
	const result = {
		data,											// The data itself as a 2D array
		
		timestamp,										// The timestamp at which the data was taken
		timestamps: [									// All the timestamps found in the source file
			file.header.time_data,
			file.header.time_validity
		],
		
		size_full: arr_size,							// The full width/height if we don't extract an area
		size: {
			width: data[0].length,						// Number of values on the X axis of this frame
			height: data.length							// Number of values on the Y axis of this frame
		},
		
		count_total: arr_size.width * arr_size.height,	// Total number of values if we didn't extract an area
		count: data.length * data[0].length,			// Number of values in this frame
		
		bounds_full,									// Full bounds of the available rainfall radar data
	};
	if(bounds_extract !== null)
		result.bounds_extract = bounds_extract;			// If we extracted a sub area, then the bounding box thereof
	return result;
}