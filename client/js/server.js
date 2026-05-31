import { config } from "./config.js";

let csrfToken = null;

export const server = {
    /* ----------------------- Auth ------------------------- */

    // Аутентификация пользователя (получение его данных)
    authUser: async () => {
        try {
            let res = await fetch(config.server.url + "auth/me", {
                "method": "GET"
            });

            if (res.ok) {
                const user = (await res.json()).user;
                csrfToken = res.headers.get("x-csrf-token");

                return { user };
            } else
                return null;
        } catch {
            return null;
        }
    },

    // Регистрация пользователя
    registerUser: async (login, password) => {
        let res = await fetch(config.server.url + "auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                login,
                password
            })
        });

        if (res.ok)
            return true;
        else
            return res.status;
    },

    // Логин пользователя
    loginUser: async (login, password) => {
        let res = await fetch(config.server.url + "auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                login,
                password
            })
        });

        if (res.ok)
            return true;
        else
            return res.status;
    },

    // Разлогин пользователя
    logoutUser: async () => {
        let res = await fetch(config.server.url + "auth/me", {
            method: "DELETE",
            headers: {
                "x-csrf-token": csrfToken
            }
        });

        if (res.ok)
            location.reload();
        else
            alert("Error: " + res.status);
    },

    /* ----------------------- Admin ------------------------ */

    // Удаления пользователя
    deleteUser: async (id) => {
        let res = await fetch(config.server.url + "admin/users/" + id, {
            method: "DELETE",
            headers: {
                "x-csrf-token": csrfToken
            },
        });

        if (res.ok)
            return true;
        else
            alert("Error: " + res.status);
        return false;
    },

    // Изменения пользователей
    changeUsers: async (users) => {
        let res = await fetch(config.server.url + "admin/users", {
            "method": "POST",
            headers: {
                "x-csrf-token": csrfToken
            },
            "body": JSON.stringify({
                users
            })
        });

        if (res.ok)
            return true;
        else
            alert("Error: " + res.status);
        return false;
    },

    /* ----------------------- Drive ------------------------ */

    // Получения списка всех файлов
    listFiles: async () => {
        try {
            const res = await fetch(config.server.url + "drive", {
                method: "GET",
                headers: {
                    "x-csrf-token": csrfToken
                }
            });

            if (res.ok)
                return (await res.json()).files;
            else
                return null;
        } catch (error) {
                return null;
        }
    },

    // Отправка файла на сервер 
    uploadFile: (activeUploads, path, file, onProgress) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            activeUploads.add(xhr);

            xhr.open("POST", config.server.url + "drive" + path);
            xhr.setRequestHeader("x-csrf-token", csrfToken);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = (event.loaded / event.total) * 100;

                    onProgress?.({
                        loaded: event.loaded,
                        total: event.total,
                        percent: percent.toFixed(2)
                    });
                }
            };

            xhr.onload = () => {
                activeUploads.delete(xhr);
                if (xhr.status !== 200) {
                    alert("Error: " + xhr.status);

                    try {
                        reject(JSON.parse(xhr.responseText));
                    } catch {
                        reject(null);
                    }
                } else
                    resolve(xhr.status);
            };

            xhr.onerror = () => {
                activeUploads.delete(xhr);
                alert("Error: Network");
                reject("Network error");
            }

            const formData = new FormData();
            formData.append("file", file);
            xhr.send(formData);
        });
    },

    // Скачивания файла
    downloadFile: (url) => {
        window.location.href = config.server.url + "drive" + url;
    },

    // Создания директории
    createDir: async (url) => {
        let res = await fetch(config.server.url + "drive" + url, {
            method: "PUT",
            headers: {
                "x-csrf-token": csrfToken
            }
        });

        if (res.ok)
            return true;
        else
            alert("Error: " + res.status);
        return false;
    },

    // Удаления файла с сервера
    deleteFile: async (url) => {
        let res = await fetch(config.server.url + "drive" + url, {
            method: "DELETE",
            headers: {
                "x-csrf-token": csrfToken
            }
        });

        if (res.ok)
            return true;
        else
            alert("Error: " + res.status);
        return false;
    },
};
