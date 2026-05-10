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

        let body = [];

        req.on("data", chunk => {
            body.push(chunk);
        });

        req.on("end", async () => {
            body = Buffer.concat(body);
            const parts = body.toString("binary").split(`--${boundary}`);

            for (let part of parts) {
                if (part.includes("filename=")) {
                    const filenameMatch = part.match(/filename="(.+?)"/);
                    if (!filenameMatch) continue;

                    const originalName = path.basename(filenameMatch[1]);

                    // безопасный путь (куда сохраняем)
                    const fullPath = getSafePath(path.join(pathFile || "", originalName));
                    if (!fullPath.ok) {
                        res.writeHead(fullPath.error);
                        res.end();
                        return;
                    }

                    // извлекаем тело файла
                    const start = part.indexOf("\r\n\r\n") + 4;
                    const end = part.lastIndexOf("\r\n");

                    const fileContent = part.slice(start, end);

                    await fs.writeFile(fullPath.data, fileContent, "binary");

                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        success: true,
                        name: originalName,
                        path: fullPath.data.replace(BASE_DIR, "")
                    }));

                    return;
                }
            }

            res.writeHead(400);
            res.end();
        });

    } catch (err) {
        res.writeHead(500);
        res.end();
    }
}

// Скачивания файла с сервера
export async function downloadFile(res, pathFile) {
    const fullPath = getSafePath(pathFile);

    if (!fullPath.ok || !(await isFile(fullPath.data))) {
        res.writeHead(404);
        res.end();
    } else {
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${path.basename(fullPath.data)}"`,
        });

        const fileStream = fsNotProm.createReadStream(fullPath.data);
        fileStream.pipe(res);
    }
}

// Создание директории
export async function createDir(pathDir) {
    const rep = getSafePath(pathDir);
    if (!rep.ok)
        return 404;

    try {
        await fs.mkdir(rep.data, { recursive: true });
    } catch (error) {
        console.error(`Failed to create ${rep.data}:`, error);
        return 500;
    }

    return 200;
}

// Удаления файла или директории
export async function deleteFile(pathFile) {
    const rep = getSafePath(pathFile);
    if (!rep.ok)
        return 404;

    let stat = null;
    try {
        stat = await fs.stat(rep.data);
    } catch (error) {
        return 404;
    }

    if (stat.isFile() || stat.isDirectory()) {
        try {
            await fs.rm(rep.data, { recursive: true, force: true });
        } catch (error) {
            console.error(`Failed to delete ${rep.data}:`, error);
            return 500;
        }
    }

    return 200;
}

// Получения списка файлов
export async function listFiles(dirPath, url = "") {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const children = await Promise.all(
        entries.map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            const urlPath = path.join(url, entry.name).replace(/\\/g, "/");

            if (entry.isDirectory()) {
                return {
                    name: entry.name,
                    type: "dir",
                    url: `/${urlPath}`,
                    children: await listFiles(fullPath, urlPath)
                };
            }

            const stats = await fs.stat(fullPath);

            return {
                name: entry.name,
                type: "file",
                size: stats.size,
                date: stats.birthtime.toISOString().split("T")[0],
                url: `/${urlPath}`
            };
        })
    );

    return children;
}
