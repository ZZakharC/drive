import { config } from "./config.js";
import { deleteFile, downloadFile, createDir, listFiles, loadFile } from "./drive.js";
import { serveFile, getBody, hashPassword, rateLimiter, validateLogin, validatePassword } from "./tools.js";
import { findUser, requireUser, loginUser, getUsers, deleteUser, createUser, changeUsers } from "./users.js";

export async function app(req, res) {
    const { method, url } = req;
    const parsedUrl = new URL(url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    console.log(`${method} ${pathname}`);

    // --------- POST ----------

    if (method === "POST") {
        // Вход
        if (pathname.startsWith("/auth/login")) {
            if (!rateLimiter(req, res)) return;
            let data = null;

            try {
                data = await getBody(req);
            } catch (error) {
                console.error(error);
            }

            if (!data || !validateLogin(data.login) || !validatePassword(data.password)) {
                res.writeHead(400);
                res.end();
            } else {
                const user = await findUser(data.login);

                if (user && user.password === hashPassword(data.password))
                    loginUser(res, user);
                else {
                    res.writeHead(401, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ ok: false }));
                }
            }
        }

        // Регистрация
        else if (pathname.startsWith("/auth/register") && config.server.registerOn) {
            if (!rateLimiter(req, res)) return;
            
            let data = null;
            try {
                data = await getBody(req);
            } catch (error) {
                console.error(error);
            }

            if (!data || !validateLogin(data.login) || !validatePassword(data.password)) {
                res.writeHead(400);
                res.end();
            } else {
                const user = await createUser(data.login, config.client.defaultRules, hashPassword(data.password));
                if (user === 409) {
                    res.writeHead(409, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ ok: false }));
                } else
                    loginUser(res, user);
            }
        }

        // Изменения пользователей
        else if (pathname === "/admin/users") {
            const rep = await requireUser(req);

            if (!rep.ok) {
                res.writeHead(rep.error);
                res.end();
            } else if (!(rep.user.rules & 4)) {
                res.writeHead(403);
                res.end();
            } else {
                let data = null;
                try {
                    data = await getBody(req);
                } catch (error) {
                    console.error(error);
                }

                if (!data) {
                    res.writeHead(400);
                    res.end();
                } else {
                    // Не изменяем права root'a (пользователя с id=0)
                    data.users = data.users.filter(u => u.id !== 0);
                    
                    changeUsers(data.users);
                    
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ ok: true }));
                }
            }
        }

        // Загрузка файла
        else if (pathname.startsWith("/drive/")) {
            const rep = await requireUser(req);

            if (!rep.ok) {
                console.log(rep);
                res.writeHead(rep.error);
                res.end();
            } else if (!(rep.user.rules & 2)) {
                res.writeHead(403);
                res.end();
            } else {
                const path = pathname.replace("/drive/", "");
                loadFile(req, res, path);
            }
        }

        // 404
        else {
            res.writeHead(404);
            res.end();
        }
    }

    // --------- POST ----------

    else if (method === "PUT") {
        // Загрузка файла
        if (pathname.startsWith("/drive/")) {
            const rep = await requireUser(req);

            if (!rep.ok) {
                console.log(rep);
                res.writeHead(rep.error);
                res.end();
            } else if (!(rep.user.rules & 2)) {
                res.writeHead(403);
                res.end();
            } else {
                const path = pathname.replace("/drive/", "");
                const code = await createDir(path);

                res.writeHead(code);
                res.end();
            }
        }

        // 404
        else {
            res.writeHead(404);
            res.end();
        }
    }

    // ---------- GET ----------

    else if (method === "GET") {
        // Аутентификация
        if (pathname === "/auth/me") {
            const rep = await requireUser(req, false); // Не проверяем CSRF

            if (!rep.ok) { 
                res.writeHead(rep.error);
                res.end();
            } else {
                res.setHeader("X-CSRF-Token", rep.session.csrf);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ user: { id: rep.user.id, name: rep.user.login, rules: rep.user.rules } }));
            }
        }

        // Список файлов
        else if (pathname === "/drive") {
            const rep = await requireUser(req, false); // Не проверяем CSRF

            if (!rep.ok) {
                res.writeHead(rep.error);
                res.end();
            } else if (!(rep.user.rules & 1)) {
                res.writeHead(403);
                res.end();
            } else {
                const files = await listFiles(config.server.drivePath);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ files }));
            }
        }

        // Доступ к файлам Drive
        else if (pathname.startsWith("/drive/")) {
            const rep = await requireUser(req, false); // Не проверяем CSRF

            if (!rep.ok) {
                res.writeHead(rep.error);
                res.end();
            } else if (!(rep.user.rules & 1)) {
                res.writeHead(403);
                res.end();
            } else {
                const path = pathname.replace("/drive/", "");
                downloadFile(res, path);
            }
        }

        // Список пользователей 
        else if (pathname === "/admin/users") {
            const rep = await requireUser(req, false); // Не проверяем CSRF

            if (!rep.ok) {
                res.writeHead(rep.error);
                res.end();
            } else if (!(rep.user.rules & 4)) {
                res.writeHead(403);
                res.end();
            } else {
                let users = (await getUsers()).map(({ password, ...rest }) => rest);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ users }));
            }
        }

        // ------ HTML Page --------

        // Main
        else if (pathname === "/") {
            const rep = await requireUser(req, false); // Не проверяем CSRF

            // отдаём login.html вместо index.html если пользователь не авторизован
            if (!rep.ok)
                serveFile(res, config.client.htmlPath + "login.html", 'text/html');
            else
                serveFile(res, config.client.mainPagePath, 'text/html');
        }

        // Login
        else if (pathname === "/login") {
            serveFile(res, config.client.htmlPath + "login.html", 'text/html');
        }

        // Register
        else if (pathname === "/register" && config.server.registerOn) {
            serveFile(res, config.client.htmlPath + "register.html", 'text/html');
        }

        // Admin
        else if (pathname === "/admin") {
            const rep = await requireUser(req, false); // Не проверяем CSRF

            if (!rep.ok) {
                res.writeHead(rep.error);
                res.end();
            } else if (!(rep.user.rules & 4)) {
                res.writeHead(403);
                res.end();
            } else
                serveFile(res, config.client.htmlPath + "admin.html", 'text/html');
        }

        // -------- Other ----------

        // Img
        else if (pathname.startsWith("/img/")) {
            const file = config.client.imgPath + pathname.replace("/img/", "");
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            await serveFile(res, file, 'image/png', null);
        }

        // Style
        else if (pathname.startsWith("/style/")) {
            const file = config.client.stylePath + pathname.replace("/style/", "");
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            await serveFile(res, file, 'text/css');
        }

        // JavaScript
        else if (pathname.startsWith("/js/")) {
            const file = config.client.javaScriptPath + pathname.replace("/js/", "");
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            await serveFile(res, file, 'text/javascript');
        }

        // ---------- 404 ----------

        else {
            res.writeHead(404);
            res.end();
        }
    }

    // -------- DELETE ---------

    else if (method === "DELETE") {
        // Удаления пользователя по id
        if (pathname.startsWith("/admin/users/")) {
            const rep = await requireUser(req);

            if (!rep.ok) {
                res.writeHead(rep.error);
                res.end();
            } else if (!(rep.user.rules & 4)) {
                res.writeHead(403);
                res.end();
            } else {
                const userId = Number(pathname.replace("/admin/users/", ""));
                const code = await deleteUser(userId); // не удаляет root'а

                res.writeHead(code);
                res.end();
            }
        }

        // Уделения файла
        else if (pathname.startsWith("/drive/")) {
            const rep = await requireUser(req);

            if (!rep.ok) {
                res.writeHead(rep.error);
                res.end();
            } else if (!(rep.user.rules & 2)) {
                res.writeHead(403);
                res.end("Forbidden");
            } else {
                const path = pathname.replace("/drive/", "");
                const code = await deleteFile(path);

                res.writeHead(code);
                res.end();
            }
        }

        // 404
        else {
            res.writeHead(404);
            res.end();
        }
    }

    // ---------- 404 ----------

    else {
        res.writeHead(404);
        res.end();
    }
}
