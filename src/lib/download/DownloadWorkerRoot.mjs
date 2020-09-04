"use strict";

import workerpool from 'workerpool';

import TarFileParser from './TarFileParser.mjs';

(async () => {
    "use strict";
    
	let parser_tar = new TarFileParser();
    
	workerpool.worker({
		parse_tar: async (filepath, target, bounds, tmpdir) => {
            await parser_tar.parse_file(filepath, target, bounds, tmpdir);
        }
	});
})();
