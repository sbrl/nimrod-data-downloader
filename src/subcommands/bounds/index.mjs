"use strict";

import a from '../../../helpers/Ansi.mjs';

export default async function(_settings, file) {
	console.error(`Data array is ${a.hicol}(${file.header.fields.cols}, ${file.header.fields.rows})${a.reset} in size`)
	console.log(JSON.stringify({
		type: "FeatureCollection",
		features: [{
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [[
					[
						file.header.locations.top_left.longitude,
						file.header.locations.top_left.latitude
					],
					[
						file.header.locations.top_right.longitude,
						file.header.locations.top_right.latitude
					],
					[
						file.header.locations.bottom_right.longitude,
						file.header.locations.bottom_right.latitude
					],
					[
						file.header.locations.bottom_left.longitude,
						file.header.locations.bottom_left.latitude
					],
					[
						file.header.locations.top_left.longitude,
						file.header.locations.top_left.latitude
					],
				]]
			}
		}]
	}));
}
