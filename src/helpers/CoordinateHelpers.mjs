import nnng from 'nnng';

/**
 * Converts OS national grid northing + easting to latitude + longitude
 * @param  {number} northing The northing
 * @param  {number} easting  The easting
 * @return {{latitude, longitude}}          The latitude and longitude.
 */
function os2latlng(northing, easting) {
	let result = nnng.from(northing, easting);
	return { latitude: result[0], longitude: result[1] };
}

/**
 * Wrapper that converts latitude and longitude to OS national grid references.
 * You shouldn't ever need to use this * shudder *.
 * @param  {number} lat The latitude
 * @param  {number} lng The longitude
 * @return {{northing, easting}}     The converted northing / easting.
 */
function latlng2os(lat, lng) {
	let result = nnng.to(lat, lng);
	return { northing: result[0], easting: result[1] };
}

/**
 * COnverts OS grid references to a location in a 2D array.
 * @param  {{top:number,right:number,bottom:number,left:number}} bounds   The bounds in OS grid references of the box
 * @param  {{width:number,height:number}} arr_size The size of the array - (0, 0) is assumed to be the origin of the array
 * @param  {number} northing The northing to convert
 * @param  {number} easting  The easting to convert
 * @return {{x:number,y:number}}          The position in the array
 */
function os2arr(bounds, arr_size, northing, easting) {
	return {
		// floor(((P.E - L) / (R - L)) * w)
		x: Math.floor(((easting - bounds.left) / (bounds.right - bounds.left)) * arr_size.width),
		y: Math.floor(((northing - bounds.top) / (bounds.bottom - bounds.top)) * arr_size.height)
		// x: Math.floor(((easting - bounds.left) / (bounds.right - bounds.left)) * arr_size.width),
		// y: Math.floor(((northing - bounds.top) / (bounds.bottom - bounds.top)) * arr_size.height)
	};
}

export { os2latlng, latlng2os, os2arr };
export default os2latlng;
