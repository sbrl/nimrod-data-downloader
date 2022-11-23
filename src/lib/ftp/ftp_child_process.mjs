"use strict";

import FtpClientManager from "./FtpClientManager.mjs";


const client = new FtpClientManager();

process.on("message", async message => {
	switch (message.event) {
		case "ipc-connect":
			await client.connect(message.args);
			process.send({
				event: "ipc-connect",
				req_id: message.req_id,
				result: null
			});
			break;
		case "ipc-disconnect":
			await client.disconnect();
			process.disconnect();
			process.exit(0);
			break;
		case "ipc-list":
			process.send({
				event: "ipc-list",
				req_id: message.req_id,
				result: await client.list(message.args.dirpath),
			});
			break;
		case "ipc-download":
			process.send({
				event: "ipc-download",
				req_id: message.req_id,
				result: await client.download(message.args.filepath_remote, message.args.filepath_local)
			});
			break;
	}
});