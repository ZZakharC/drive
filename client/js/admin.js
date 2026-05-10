import { config } from "/js/config.js";

/* -------------------- User session -------------------- */

let user = null;
let csrfToken = null;
const usrName = document.getElementById("name_spn");

// Парсинг
try {
    let response = await fetch(config.server.url + "auth/me", { "method": "GET" });
    csrfToken = response.headers.get("x-csrf-token");
    const data = await response.json();

    user = data.user;
} catch {
    user = null;
}

// Заполнения прав и имени
(() => {
    if (!user)
        alert("Error: User not found in sessionStorage");
    else
        usrName.textContent = user.name;
})();

/* -------------------- Users view -------------------- */

let changes = new Map();
const applyBtn = document.getElementById("apply_btn");
const uContainer = document.getElementById("users_container");

async function deleteUser(user, user_block) {
    if (!confirm(`Удалить пользователя ${user.login}?`)) return;

    let res = await fetch(config.server.url + "admin/users/" + user.id, {
        method: "DELETE",
        headers: {
            "x-csrf-token": csrfToken
        },
    });

    if (res.ok)
        user_block.remove();
    else
        alert("Error: " + res.status);
}

// Render users
function renderUser(user) {
    const isRoot = user.id === 0;
    let user_block = document.createElement("div");

    user_block.classList.add("user");
    if (isRoot)
        user_block.classList.add("disable");

    // Имя пользователя
    let name = document.createElement("span");
    name.textContent = user.id + ":" + user.login;

    // Блок с правами
    let rules = document.createElement("div");
    rules.classList.add("rules");

    config.rule_map.forEach((perm, index) => {
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        if (isRoot)
            checkbox.disabled = true;

        // Проверяем, есть ли бит
        checkbox.checked = (user.rules & perm.bit) !== 0;

        // (опционально) обработка изменения
        checkbox.addEventListener("change", () => {
            if (checkbox.checked)
                user.rules |= perm.bit;   // включить бит
            else
                user.rules &= ~perm.bit;  // выключить бит

            changes.set(user.id, user.rules);
            applyBtn.classList.remove("off");
        });

        rules.appendChild(checkbox);

        // подпись
        if (index < config.rule_map.length - 1)
            rules.appendChild(document.createTextNode("/"));
    });

    // Кнопка удаления
    let delBtn = document.createElement("button");
    delBtn.classList.add("red");
    delBtn.textContent = "Удалить";

    if (isRoot)
        delBtn.classList.add("disable");

    delBtn.addEventListener("click", () => { deleteUser(user, user_block) });

    // Сборка
    user_block.appendChild(name);
    user_block.appendChild(rules);
    user_block.appendChild(delBtn);

    uContainer.appendChild(user_block);
}

// Load users
(async () => {
    const res = await fetch(config.server.url + "admin/users", {
        method: "GET",
        headers: {
            "x-csrf-token": csrfToken
        }
    });
    let body = await res.json();

    if (!res.ok)
        alert("Error: " + res.status);
    else
        body.users.forEach(user => { renderUser(user); });
})();

// Apply changes
applyBtn.onclick = async () => {
    const users = Array.from(changes.entries()).map(([id, rules]) => ({
        id,
        rules
    }));

    let response = await fetch(config.server.url + "admin/users", {
        "method": "POST",
        headers: {
            "x-csrf-token": csrfToken
        },
        "body": JSON.stringify({
            users
        })
    });

    if (!response.ok)
        alert("Error: " + response.status);
    else
        applyBtn.classList.add("off");
}
