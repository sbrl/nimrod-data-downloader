"use strict";

import workerpool from 'workerpool';

import TarFileParser from './TarFileParser.mjs';

(async () => {
    "use strict";
    
	let parser_tar = new TarFileParser();
    
	workerpool.worker({
		parse_tar: async (filepath, target, bounds, tmpdir) => {
            let start_time = new Date();
            try {
                await parser_tar.parse_file(filepath, target, bounds, tmpdir);
            } catch(error) {
                return { status: "error", error };
            }
            return { status: "success", time_taken: (new Date() - start_time) };
        }
	});
})();
