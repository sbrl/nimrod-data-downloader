"use strict";

import gunzip from 'gunzip-maybe';

async function eat_stream(stream) {
	return new Promise((resolve, reject) => {
		let buffers = [];
		stream.on("error", reject);
		stream.on("data", (block) => {
			buffers.push(block);
		});
		stream.on("end", () => {
			let size_total = 0;
			for(let buffer of buffers)
				size_total += buffer.length;
			
			let big_buffer = Buffer.alloc(size_total),
				pos_current = 0;
			for(let buffer of buffers) {
				buffer.copy(big_buffer, pos_current);
				
				pos_current += buffer.length;
			}
			
			resolve(big_buffer);
		});
	});
}

async function eat_stream_gunzip_maybe(stream) {
	let decompressor = gunzip();
	stream.pipe(decompressor);
	return await eat_stream(decompressor);
}

export { eat_stream, eat_stream_gunzip_maybe };
