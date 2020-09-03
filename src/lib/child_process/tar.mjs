"use strict";

import child_process from 'child_process';

function untar(archive, target) {
	return new Promise((resolve, reject) => {
		let tar_process = child_process.spawn("tar", [ "-xf", archive, "-C", target ]);
		tar_process.on("exit", resolve);
		tar_process.on("error", reject);
	});
}

export { untar }
