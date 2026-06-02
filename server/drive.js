import { config } from "./config.js";
import fsNotProm from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const BASE_DIR = path.resolve(config.server.drivePath);

// Получения полного безопасного пути
function getSafePath(userInputPath) {
    const fullPath = path.resolve(BASE_DIR, userInputPath);

    if (!fullPath.startsWith(BASE_DIR))
        return { ok: false, error: 403 };

    return { ok: true, data: fullPath };
}

// Проверка это файл
async function isFile(path) {
    try {
        const stat = await fs.stat(path);
        return stat.isFile();
    } catch {
        return false;
    }
}

// Загрузка файла на сервер
export async function loadFile(req, res, pathFile) {
    try {
        const contentType = req.headers["content-type"];
        if (!contentType || !contentType.includes("multipart/form-data")) {
            res.writeHead(400);
            res.end();
            return;
        }

        const boundaryMatch = contentType.match(/boundary=(.+)$/);
        if (!boundaryMatch) {
            res.writeHead(400);
            res.end();
            return;
        }

        const boundary = boundaryMatch[1];
        let totalSize = 0;
        let body = [];

        req.on("data", chunk => {
            totalSize += chunk.length;

            if (totalSize > config.server.maxFileSize) {
                req.destroy(); // останавливаем поток

                res.writeHead(413);
                res.end();
                return;
            }

            body.push(chunk);
        });

        req.on("end", async () => {
            if (totalSize > config.server.maxFileSize) return;

            body = Buffer.concat(body);

            let start = body.indexOf(boundary);
            if (start === -1) {
                res.writeHead(400);
                return res.end();
            }

            while (start !== -1) {
                let end = body.indexOf(boundary, start + boundary.length);
                if (end === -1) break;

                const part = body.slice(start + boundary.length, end);

                const headerEnd = part.indexOf("\r\n\r\n");
                if (headerEnd !== -1) {
                    const headers = part.slice(0, headerEnd).toString("utf8");
                    const data = part.slice(headerEnd + 4, part.length - 2); // -2 убирает \r\n

                    if (headers.includes("filename=") || headers.includes("filename*=")) {

                        let originalName;

                        // 1) RFC 5987: filename*=UTF-8''encoded
                        const filenameStarMatch = headers.match(/filename\*\s*=\s*([^']*)''([^;\r\n]+)/i);
                        if (filenameStarMatch) {
                            try {
                                originalName = decodeURIComponent(filenameStarMatch[2]);
                            } catch {
                                originalName = filenameStarMatch[2];
                            }
                        }

                        // 2) обычный filename="..."
                        if (!originalName) {
                            const filenameMatch = headers.match(/filename\s*=\s*"([^"]+)"/i);
                            if (filenameMatch) {
                                originalName = filenameMatch[1];
                            }
                        }

                        if (!originalName) continue;

                        const safeName = path.basename(originalName);

                        const fullPath = getSafePath(path.join(pathFile || "", safeName));
                        if (!fullPath.ok) {
                            res.writeHead(fullPath.error);
                            return res.end();
                        }

                        try {
                            await fs.writeFile(fullPath.data, data);
                        } catch (err) {
                            console.error(err);
                            return;
                        }

                        res.writeHead(200, { "Content-Type": "application/json" });
                        return res.end(JSON.stringify({
                            success: true,
                            name: originalName,
                            path: fullPath.data.replace(BASE_DIR, "")
                        }));
                    }
                }

                start = end;
            }

            res.writeHead(400);
            res.end();
        });

    } catch (err) {
        console.error(err);
        res.writeHead(500);
        res.end();
    }
}

// Скачивания файла с сервера
export async function downloadFile(res, pathFile) {
    const fullPath = getSafePath(pathFile);

    if (!fullPath.ok || !(await isFile(fullPath.data))) {
        res.writeHead(403);
        res.end();
    } else {
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(path.basename(fullPath.data))}"`,
        });

        const fileStream = fsNotProm.createReadStream(fullPath.data);
        fileStream.pipe(res);
    }
}

// Создание директории
export async function createDir(pathDir) {
    const rep = getSafePath(pathDir);
    if (!rep.ok)
        return { ok: false, error: 403 };

    try {
        await fs.mkdir(rep.data, { recursive: true });
    } catch (error) {
        console.error(`Failed to create ${rep.data}:`, error);
        return { ok: false, error: 500 };
    }

    return { ok: true };
}

// Удаления файла или директории
export async function deleteFile(pathFile) {
    const rep = getSafePath(pathFile);
    if (!rep.ok)
        return { ok: false, error: 403 };

    let stat = null;
    try {
        stat = await fs.stat(rep.data);
    } catch (error) {
        return { ok: false, error: 500 };
    }

    if (stat.isFile() || stat.isDirectory()) {
        try {
            await fs.rm(rep.data, { recursive: true, force: true });
        } catch (error) {
            console.error(`Failed to delete ${rep.data}:`, error);
            return { ok: false, error: 500 };
        }
    }

    return { ok: true };
}

// Получения списка файлов
export async function listFiles(pathDir) {
    const rep = getSafePath(pathDir);
    if (!rep.ok)
        return { ok: false, error: 403 };
    if (await isFile(rep.data))
        return { ok: false, error: 400 };

    const entries = await fs.readdir(rep.data, { withFileTypes: true });
    let url = rep.data.replace(BASE_DIR, "");
    if (!url.startsWith('/')) url = '/' + url;

    const list = await Promise.all(
        entries.map(async (entry) => {
            const fullPath = path.join(rep.data, entry.name);
            const urlPath = path.join(url, entry.name).replace(/\\/g, "/");

            if (entry.isDirectory()) {
                return {
                    name: entry.name,
                    type: "dir",
                    url: `${urlPath}`
                };
            }

            const stats = await fs.stat(fullPath);

            return {
                name: entry.name,
                type: "file",
                size: stats.size,
                date: stats.birthtime.toISOString().split("T")[0],
                url: `${urlPath}`
            };
        })
    );

    return { ok: true, data: list };
}
