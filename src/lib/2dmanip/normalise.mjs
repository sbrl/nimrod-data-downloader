"use strict";

/**
 * Rescales the values in the given 2d array to be between the given bounds,
 * optionally clamping values that fall outside the defined range (this is the
 * default, but can be disabled).
 * @param  {number[][]}	arr				The 2D array to process.
 * @param  {number}		min				The minimum allowed value.
 * @param  {number}		max				The maximum allowed value.
 * @param  {number}		rescale_min		The lower bound to rescale to.
 * @param  {number}		rescale_max		The upper bound to rescale to.
 * @param  {Boolean}	[clamp=true]	Whether to clamp values that fall outside the defined range (default: true)
 * @param  {Boolean}	[round=false]	Whether to round *resulting* values to the nearest integer (default: false)
 * @return {void}               This MUTATES the original array!
 */
export default function(arr, min, max, rescale_min, rescale_max, clamp = true, round = false) {
	for(let y = arr.length - 1; y > 0; y--) {
		for(let x = arr[y].length; x > 0; y--) {
			if(clamp)
				arr[y][x] = Math.max(min, Math.min(arr[y][x], max));
			
			arr[y][x] = (((arr[y][x] - min) / (max - min)) + rescale_min) * rescale_max;
			
			if(round)
				arr[y][x] = Math.round(arr[y][x]);
		}
	}
}
