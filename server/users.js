import { config } from "./config.js";
import { getCookie, hashPassword } from "./tools.js";
import crypto from "node:crypto";
import fs from "node:fs/promises";

const sessions = new Map();

// Очистка устаревших сессий
setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions)
        if (session.expires < now) sessions.delete(token);
}, 60_000); // Каждый час

// Получения пользователя из запроса с проверкой CSRF (по умолчанию включено)
export async function requireUser(req, checkCSRF = true) {
    const token = getCookie(req, "token");
    const session = sessions.get(token);

    // Отсутствует токен/сессия или сессия устарела
    if (!token || !session || session.expires < Date.now())
        return { ok: false, error: 401 };
    else {
        // Защита от CSRF
        const csrfHeader = req.headers["x-csrf-token"];
        if ((!csrfHeader || csrfHeader !== session.csrf) && checkCSRF)
            return { ok: false, error: 403 };

        // Пользователь не существует
        const user = await getUser(session.id);
        if (!user)
            return { ok: false, error: 401 };

        return { ok: true, user, token, session, csrfHeader };
    }
}

// Логин пользователя
export function loginUser(res, user) {
    const token = crypto.randomUUID();
    const csrf = crypto.randomUUID();
    sessions.set(token, {
        id: user.id,
        csrf: csrf,
        expires: Date.now() + config.server.sessionTime
    });

    res.setHeader("Set-Cookie", `token=${token}; Secure; HttpOnly; SameSite=Strict; Path=/`);
    res.setHeader("X-CSRF-Token", csrf);
    res.statusCode = 200;

    res.end(JSON.stringify({ ok: true }));
}

// Создания пользователя
export async function createUser(login, rules, password) {
    let users = JSON.parse(await fs.readFile(config.server.usersFile, 'utf8'));

    // Если пользователь есть выходим
    if (users.some(user => user.login === login))
        return 409;

    const hash = hashPassword(password);
    const maxId = users.reduce((max, u) => Math.max(max, u.id), -1);
    const newUser = {
        id: maxId + 1,
        login,
        salt: hash.salt,
        hashPassword: hash.hash,
        rules: (maxId === -1 ? 7 : rules) // Если это первый пользователь то присваиваем ему права root
    };

    users.push(newUser);

    await fs.writeFile(
        config.server.usersFile,
        JSON.stringify(users, null, 2),
        'utf8'
    );

    return newUser;
}

// Удаления пользователя
export async function deleteUser(id) {
    try {
        if (Number.isNaN(id)) return 400;

        let users = JSON.parse(await fs.readFile(config.server.usersFile, 'utf8'));
        const newUsers = users.filter(u => u.id !== id);

        // если ничего не удалилось 404
        if (newUsers.length === users.length)
            return 404;

        // Записываем в файл
        await fs.writeFile(
            config.server.usersFile,
            JSON.stringify(newUsers, null, 2),
            'utf8'
        );

        // Удаляем сессию пользователя
        for (const [token, session] of sessions)
            if (session.id === id) sessions.delete(token);

        return 200;
    } catch (error) {
        console.error("Error read user db", error);
        return 500;
    }
}

// Изменения пользователя
export async function changeUsers(modifiedUsers) {
    if (modifiedUsers.length === 0) return;

    try {
        let users = JSON.parse(await fs.readFile(config.server.usersFile, 'utf8'));

        for (const updated of modifiedUsers) {
            const index = users.findIndex(u => u.id === updated.id);

            if (index !== -1)
                users[index] = { ...users[index], ...updated };
        }

        await fs.writeFile(
            config.server.usersFile,
            JSON.stringify(users, null, 2),
            'utf8'
        );
    } catch (error) {
        console.error("Error read user db", error);
        return;
    }
}

// Получения списка всех пользователей
export async function getUsers() {
    try {
        return JSON.parse(await fs.readFile(config.server.usersFile, 'utf8'));
    } catch (error) {
        console.error("Error read user db", error);
        return null;
    }
}

// Поиск пользователя по логину
export async function findUser(login) {
    try {
        let users = JSON.parse(await fs.readFile(config.server.usersFile, 'utf8'));

        return users.find(u => u.login === login);
    } catch (error) {
        console.error("Error read user db", error);
        return null;
    }
}

// Поиск пользователя по id
export async function getUser(id) {
    try {
        let users = JSON.parse(await fs.readFile(config.server.usersFile, 'utf8'));
        return users.find(u => { if (u.id === id) return u });
    } catch (error) {
        console.error("Error read user db", error);
        return null;
    }
}
