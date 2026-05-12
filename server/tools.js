import { config } from "./config.js";
import fs from "node:fs/promises";
import crypto from "node:crypto";

const rateLimitMap = new Map();

// Лимитер 
export function rateLimiter(req, res) {
    const ip = req.socket.remoteAddress; 
    const now = Date.now();
    let entry = rateLimitMap.get(ip);

    // Если нет данных или прошло время сбрасываем счётчик
    if (!entry || now - entry.lastAttempt > config.server.rateLimit.windowMs) {
        entry = { attempts: 1, lastAttempt: now };
        rateLimitMap.set(ip, entry);
        return true;
    }
    // Если запросов больше допустимого выбрасываем ошибку
    if (entry.attempts >= config.server.rateLimit.maxAttempts) {
        res.writeHead(429, {'Content-Type': 'text/plain'});
        res.end('Too many requests');
        return false;
    }

    entry.attempts++;
    entry.lastAttempt = now;
    return true;
}

// Чтения файла
export async function serveFile(res, path, contentType, type = 'utf8') {
    try {
        const data = await fs.readFile(path, type);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    } catch {
        res.writeHead(404, { 'Content-Type': contentType });
        res.end("");
    }
}

// Получения тела запроса
export function getBody(req, maxSize = config.server.maxBodySize) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", chunk => {
            body += chunk.toString();

            // Защита от огромного body
            if (body.length > maxSize) {
                reject(new Error("Body too large"));
                req.destroy();
            }
        });

        req.on("end", () => {
            try {
                resolve(JSON.parse(body));
            } catch {
                reject(new Error("Invalid JSON"));
            }
        });

        req.on("error", reject);
    });
}

// Получения куки (по имени)
export function getCookie(req, name) {
    const cookies = req.headers.cookie?.split(";") ?? [];

    for (const cookie of cookies) {
        const [key, value] = cookie.trim().split("=");

        if (key === name)
            return value;
    }

    return null;
}

// Хеш пароля
export function hashPassword(password, salt = null) {
    // Если соль передана то используем её иначе генерируем новую
    salt ??= crypto.randomBytes(config.server.hashPassword.saltLength).toString("hex");
    
    const hash = crypto.pbkdf2Sync(
        password,
        salt,
        config.server.hashPassword.iterations, 
        config.server.hashPassword.hashLength, 
        config.server.hashPassword.method
    ).toString('hex');

    return { hash, salt };
}

// Проверка пароля на валидность
export function validatePassword(password) {
    if (!password) return false;

    // латиница, цифры + спецсимволы
    const regex = new RegExp(
        `^[a-zA-Z0-9._!@#$%^&*()\\-+=\\[\\]{}|;:'",.<>/?]{${config.server.minLengthPassword},100}$`
    );

    return regex.test(password);
}

// Проверка логина на валидность
export function validateLogin(login) {
    if (!login) return false;

    // латиница, цифры, _, ., -
    const regex = new RegExp(
        `^[a-zA-Z0-9._-]{${config.server.minLengthLogin},50}$`
    );

    return regex.test(login);
}
