#!/usr/bin/env node
"use strict";

import cli from './bootstrap/cli.mjs';

(async () => {
    "use strict";
    
    await cli();
})();
