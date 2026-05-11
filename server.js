import { config } from "./server/config.js";
import { app } from "./server/app.js";
import process from "node:process";
import https from "node:https";
import fs from "node:fs";

// Если соли нет то завершаем процесс
if (!config.server.salt) {
    console.error("FATAL: SALT environment variable is required. Use 'openssl rand -hex 128' to generation the salt.");
    process.exit(1);
}

// Параметры для HTTPS
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
