"use strict";

/**
 * @source	https://stackoverflow.com/a/52827031/1460422
 * @returns	{Boolean} true if system is big endian
 */
export default function isBigEndian() {
    const array = new Uint8Array(4);
    const view = new Uint32Array(array.buffer);
    return !((view[0] = 1) & array[0]);
}
