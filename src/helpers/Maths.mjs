"use strict";

/**
 * Rounds a number to a given number of decimal places.
 * @param  {number} x    The number to round.
 * @param  {number} step The step value to use when rounding. For example, 10 = 1dp, 100 = 2dp, etc.
 * @return {number}      The rounded number.
 */
function floor_precision(x, step) {
	return Math.floor((x + Number.EPSILON) * step) / step;
}


export {
	floor_precision
}
