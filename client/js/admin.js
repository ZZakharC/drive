import { config } from "/js/config.js";
import { server } from "/js/server.js";

/* -------------------- User session -------------------- */

let user = null;
let csrfToken = null;
const usrNameSpn = document.getElementById("name_spn");

// Заполнения данных о пользователе
(async () => {
    const res = await server.authUser();

    if (!res)
        alert("Error: auth");
    else {
        // Устанавливаем user
        user = res.user;

        // Отображаем пользователей
        renderUsers();

        usrNameSpn.textContent = user.name;
        usrNameSpn.addEventListener("click", () => { if (confirm(`Выйти из аккаунта ${user.name}?`)) server.logoutUser() });
    }
})();

/* -------------------- Users view -------------------- */

let changes = new Map();
const applyBtn = document.getElementById("apply_btn");
const uContainer = document.getElementById("users_container");

async function deleteUser(user, user_block) {
    if (!confirm(`Удалить пользователя ${user.login}?`)) return;

    if (await server.deleteUser(user.id))
        user_block.remove();
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

async function renderUsers() {
    const users = await server.listUsers();

    if (!users)
        alert("Error");
    else
        users.forEach(user => { renderUser(user); });
}

// Apply changes
applyBtn.onclick = async () => {
    const users = Array.from(changes.entries()).map(([id, rules]) => ({
        id,
        rules
    }));

    if (await server.changeUsers(users)) {
        applyBtn.classList.add("off");
        renderUsers();
    }
}
