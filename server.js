import { config } from "./server/config.js";
import { app } from "./server/app.js";
import https from "node:https";
import fs from "node:fs";

if (!config.server.salt) {
    console.error('FATAL: SALT environment variable is required');
    process.exit(1);
}

const options = {
    key: fs.readFileSync(config.server.https.keyFilePath),
    cert: fs.readFileSync(config.server.https.certFilePath),
};

// Create the server
const server = https.createServer(options, app);

// Start the server
server.listen(config.server.port, config.server.host, () => {
    console.log(`Server running at https://${config.server.host}:${config.server.port}/`);
});
