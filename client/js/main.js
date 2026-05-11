import { config } from "/js/config.js";

/* -------------------- User session -------------------- */

let user = null;
let csrfToken = null;

const usrRulesSpn = document.getElementById("rules_spn");
const usrNameSpn = document.getElementById("name_spn");
const adminPanelSpn = document.getElementById("admin_panel_btn");
const previewDeleteBtn = document.getElementById("preview_delete_btn");
const newMenuOpenBtn = document.getElementById("new_menu_open_btn");

// Парсинг
try {
    let response = await fetch(config.server.url + "auth/me", { "method": "GET" });
    csrfToken = response.headers.get("x-csrf-token");
    const data = await response.json();

    user = data.user;
} catch (error) {
    user = null;
    alert("Error: " + error);
}

// Заполнения данных о пользователе
(() => {
    if (!user)
        alert("Error: auth");
    else {
        // Делаем кнопку удаления файла активной 
        if (user.rules & config.rule.CHANGE) {
            previewDeleteBtn.classList.remove("disable");
            newMenuOpenBtn.classList.remove("disable");
        }
        // админ панель
        if (user.rules & config.rule.ADMIN)
            adminPanelSpn.classList.remove("off");

        const rules = config.rule_map
            .filter(rule => user.rules & rule.bit)
            .map(rule => rule.label)
            .join("");

        usrNameSpn.textContent = user.name;
        usrRulesSpn.textContent = rules;
    }
})();

/* ----------------------- Drive ------------------------ */

let path = "/";
let rootDir = null;
let realDir = null;

// Контейнеры
const mainContainer = document.getElementById("container");
const fContainer = document.getElementById("files_container");

// Путь
const pathSpn = document.getElementById("path_spn");
const upDirBtn = document.getElementById("up_dir_btn");

// Предпросмотр
const previewDiv = document.getElementById("preview_div");
const previewNameSpn = document.getElementById("preview_name_spn");
const previewImg = document.getElementById("preview_img");
const previewPathSpn = document.getElementById("preview_path_spn");
const previewSizeSpn = document.getElementById("preview_size_spn");
const previewDateSpn = document.getElementById("preview_date_spn");
const previewDownloadBtn = document.getElementById("preview_download_btn");
// const previewDeleteBtn = document.getElementById("preview_delete_btn"); Выше по коду в заполнении данных пользователя

// Меню файла
const fileMenuDiv = document.getElementById('file_menu_div');
const fileMenuDownloadBtn = document.getElementById('file_menu_download_btn');
const fileMenuDeleteBtn = document.getElementById('file_menu_delete_btn');

// Меню добавления
// const newMenuOpenBtn = document.getElementById("file_add_btn"); Выше по коду в заполнении данных пользователя
const newMenuDiv = document.getElementById('new_menu_div');
const newMenuOpenCreateDirBtn = document.getElementById('new_menu_open_create_dir_btn');
// Загрузка файлов
const newMenuUploadFileBtn = document.getElementById('upload_file_btn');
const newMenuUploadFileInp = document.getElementById('upload_file_inp');
// Создание папки
const createDirDiv = document.getElementById('create_dir_div');
const createDirBtn = document.getElementById('create_dir_btn');
const createDirInp = document.getElementById('create_dir_inp');

// Инфо о файле в bottom-bar
const bottomNameSpn = document.getElementById("file_name_spn");
const bottomTypeSpn = document.getElementById("file_type_spn");
const bottomSizeSpn = document.getElementById("file_size_spn");
const bottomDateSpn = document.getElementById("file_data_spn");

/* --------------------- Server API --------------------- */

// Отправка файла на сервер 
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(config.server.url + 'drive' + path, {
        method: 'POST',
        headers: {
            "x-csrf-token": csrfToken
        },
        body: formData   // заголовок Content-Type браузер установит автоматически
    });

    if (!response.ok) {
        alert('Error: ' + response.status);
        return null;
    }

    try {
        const result = await response.json();
        return result;
    } catch (error) {
        return null;
    }
}

// Скачивания файла
function downloadFile(url) {
    window.location.href = config.server.url + "drive" + url;
}

// Создания директории
async function createDir(url) {
    let res = await fetch(config.server.url + "drive" + url, {
        method: "PUT",
        headers: {
            "x-csrf-token": csrfToken
        }
    });

    if (res.ok)
        return true;

    alert("Error: " + res.status);
    return false;
}

// Удаления файла с сервера
async function deleteFile(url) {
    let res = await fetch(config.server.url + "drive" + url, {
        method: "DELETE",
        headers: {
            "x-csrf-token": csrfToken
        }
    });

    if (res.ok)
        return true;

    alert("Error: " + res.status);
    return false;
}

/* -------------------- Render files -------------------- */

// Размер файла в строку
function sizeString(size) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;

    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }

    const value = size % 1 === 0 ? size : size.toFixed(2);
    return `${value} ${units[i]}`;
}

// Дату в строку YYYY-MM-DD
function dateString(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// Отобразить файл
function renderFile(file) {
    const isDir = file.type === "dir";

    let file_block = document.createElement("div");
    file_block.classList.add("file");

    let ext = isDir ? "folder" : file.name.split('.').pop().toLowerCase();
    const iconName = config.file_map[ext] || config.file_map["default"];

    let img = document.createElement("img");
    img.src = `img/${iconName}.png`;
    img.addEventListener('dragstart', e => e.preventDefault()); // Запрещаем пользователю перетаскивать иконку

    let name = document.createElement("span");
    name.textContent = isDir ? file.name + "/" : file.name;

    let size = document.createElement("span");
    size.classList.add("size");
    if (!isDir)
        size.textContent = sizeString(file.size);

    file_block.append(img, name, size);

    // Event папки
    if (isDir) {
        file_block.addEventListener("dblclick", () => {
            pathSpn.textContent = file.url;
            path = file.url + '/';
            upDirBtn.classList.remove("off");
            file_block.dispatchEvent(new Event("mouseleave")); // Вызываем эвент 

            realDir = file.children;
            renderFiles(file.children);
        });
    }
    // Event файла
    else {
        file_block.addEventListener("dblclick", () => {
            previewNameSpn.textContent = file.name;
            previewImg.src = img.src;
            previewPathSpn.textContent = file.url;
            previewSizeSpn.textContent = (size.textContent || "неизвестно");
            previewDateSpn.textContent = (file.date || "неизвестно");
            previewDeleteBtn.url = file.url;
            previewDownloadBtn.url = file.url;

            mainContainer.className = "main-bar file-preview";
        });
    }

    // Общие Event

    // ПКМ
    file_block.addEventListener("contextmenu", (e) => { fileMenuOpen(e, file_block, file); });

    // hover
    file_block.addEventListener("mouseenter", () => {
        bottomNameSpn.textContent = "Путь: " + file.url;
        bottomTypeSpn.textContent = "Тип: " + ext;
        bottomSizeSpn.textContent = "Размер: " + (size.textContent || "неизвестно");
        bottomDateSpn.textContent = "Дата: " + (file.date || "неизвестно");
    });

    file_block.addEventListener("mouseleave", () => {
        bottomNameSpn.textContent = "";
        bottomTypeSpn.textContent = "";
        bottomSizeSpn.textContent = "";
        bottomDateSpn.textContent = "";
    });

    fContainer.appendChild(file_block);
}

// Отобразить файлы
function renderFiles(files) {
    // Сортировка сначала директории потом файлы
    files.sort((a, b) => {
        // 1. папки выше файлов
        if (a.type === "dir" && b.type !== "dir") return -1;
        if (a.type !== "dir" && b.type === "dir") return 1;

        // 2. внутри группы — по алфавиту
        return a.name.localeCompare(b.name, "ru", {
            sensitivity: "base"
        });
    });

    fContainer.innerHTML = "";
    files.forEach(file => {
        renderFile(file);
    });
}

/* -------------------- Load & Render ------------------- */

(async () => {
    const res = await fetch(config.server.url + "drive", {
        method: "GET",
        headers: {
            "x-csrf-token": csrfToken
        }
    });

    try {
        let body = await res.json();

        if (res.ok === false)
            document.body.innerText = res.status;
        else {
            rootDir = realDir = body.files;
            renderFiles(rootDir);
        }
    } catch (error) {
        console.error(error);
        alert("Error: Server error");
    }
})();

/* ------------------------ Path ------------------------ */

// Подняться на папку в верх
upDirBtn.addEventListener("click", () => {
    if (!path || path === "/") return;

    // убираем последний сегмент
    let parts = path.split("/").filter(Boolean);
    parts.pop();

    path = "/" + parts.join("/");

    pathSpn.textContent = path;

    // Выключаем кнопку если мы в корне /
    if (path === "/")
        upDirBtn.classList.add("off");

    // перерисовка
    let dir = rootDir;

    for (const part of parts) {
        const downDir = dir.find(f => f.name === part && f.type === "dir");
        if (!downDir) return;

        dir = downDir.children;
    }

    renderFiles(dir);
});

/* ---------- Drag & Drop Event (file upload) ----------- */

let dragCounter = 0;

// Отмена действий по умолчанию для всех событий Drag & Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    mainContainer.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

mainContainer.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (!(user.rules & config.rule.CHANGE)) return;

    dragCounter++;
    mainContainer.classList.add('drag');
});

mainContainer.addEventListener('dragleave', (e) => {
    e.preventDefault();
    if (!(user.rules & config.rule.CHANGE)) return;

    dragCounter--;
    if (dragCounter <= 0) {
        dragCounter = 0;
        mainContainer.classList.remove("drag");
    }
});

mainContainer.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (!(user.rules & config.rule.CHANGE)) return;

    dragCounter = 0;
    mainContainer.classList.remove('drag');
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
        for (const file of dt.files) {
            const res = await uploadFile(file);

            if (res) {
                const index = realDir.findIndex(f => f.name === file.name);
                if (index !== -1) realDir.splice(index, 1);

                realDir.push({
                    name: file.name,
                    type: 'file',
                    size: file.size,
                    date: dateString(file.lastModified),
                    url: path + file.name
                });
            }
        }

        renderFiles(realDir);
    }

    mainContainer.classList.remove("file-preview");
    mainContainer.classList.remove("new-menu");
});

/* -------------------- Preview file -------------------- */

function previewClose(e) {
    if (e.target === previewDiv)
        mainContainer.classList.remove("file-preview");
}

// Закрыть Preview
previewDiv.addEventListener("click", previewClose);
previewDiv.addEventListener("contextmenu", previewClose);

// Скачать файл
previewDownloadBtn.addEventListener("click", async () => {
    downloadFile(previewDownloadBtn.url);
});

// Удалить файл
previewDeleteBtn.addEventListener("click", async () => {
    if (!confirm(`Удалить файл ${previewDeleteBtn.url}?`)) return;

    const res = await deleteFile(previewDeleteBtn.url);
    if (res) {
        const index = realDir.findIndex(item => item.url === previewDeleteBtn.url);
        if (index !== -1) realDir.splice(index, 1);

        mainContainer.classList.remove("file-preview");
        renderFiles(realDir);
    }
});

/* ---------------------- File menu --------------------- */

let activeFileBlock = null;

// Открыть меню
function fileMenuOpen(e, file_block, file) {
    e.preventDefault();

    // если уже открыто для того же блока ничего не делаем
    if (mainContainer.classList.contains("file-menu") && activeFileBlock === file_block)
        return;

    activeFileBlock = file_block;

    // Отрисовка

    mainContainer.classList.add("file-menu");
    const padding = "15px"

    // X
    fileMenuDiv.style.right = fileMenuDiv.style.left = "auto";
    if (fileMenuDiv.offsetWidth + e.clientX > window.innerWidth)
        fileMenuDiv.style.right = padding;
    else
        fileMenuDiv.style.left = e.clientX + "px";

    // Y
    fileMenuDiv.style.top = fileMenuDiv.style.bottom = "auto";
    if (fileMenuDiv.offsetHeight + e.clientY > window.innerHeight)
        fileMenuDiv.style.bottom = padding;
    else
        fileMenuDiv.style.top = e.clientY + "px";

    // Настройка кнопок

    if (file.type === "dir") {
        fileMenuDownloadBtn.classList.add("off");
        fileMenuDownloadBtn.textContent = "Скачать папку";
        fileMenuDeleteBtn.textContent = "Удалить папку";
    } else {
        fileMenuDownloadBtn.classList.remove("off");
        fileMenuDownloadBtn.textContent = "Скачать файл";
        fileMenuDeleteBtn.textContent = "Удалить файл";
    }

    fileMenuDownloadBtn.onclick = () => {
        downloadFile(file.url);
        mainContainer.classList.remove("file-menu");
    };

    fileMenuDeleteBtn.onclick = async () => {
        if (!confirm(`Удалить ${file.url}?`)) return;
        const res = await deleteFile(file.url);
        if (res) {
            const index = realDir.findIndex(item => item.url === file.url);
            if (index !== -1) realDir.splice(index, 1);

            mainContainer.classList.remove("file-preview");
            renderFiles(realDir);
        }
        mainContainer.classList.remove("file-menu");
    };
}

// Закрыть меню
function fileMenuClose(e) {
    const insideMenu = fileMenuDiv.contains(e.target);
    const insideBtn = activeFileBlock?.contains(e.target);
    if (!insideMenu && !insideBtn) {
        mainContainer.classList.remove("file-menu");
        activeFileBlock = null;
    }
}

// Глобальные Event
document.addEventListener("click", fileMenuClose);
document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    fileMenuClose(e);
});

/* ---------------------- New menu ---------------------- */

// Закрытие newMenu
function newMenuClose(e) {
    const insideMenu = newMenuDiv.contains(e.target);
    const insideBtn = newMenuOpenBtn.contains(e.target);

    if (!insideBtn && !insideMenu) {
        mainContainer.classList.remove("new-menu");
        mainContainer.onclick = null;
    }
}

document.addEventListener("contextmenu", newMenuClose);
document.addEventListener("click", newMenuClose);

// Открыть newMenu
function newMenuOpen() {
    mainContainer.classList.add("new-menu");
}

newMenuOpenBtn.addEventListener("click", newMenuOpen);
newMenuOpenBtn.addEventListener("contextmenu", newMenuOpen);

// Нажатие на newMenuUploadFileInp и закрытие newMenu
newMenuUploadFileBtn.addEventListener("click", () => {
    mainContainer.classList.remove("new-menu");
    newMenuUploadFileInp.click();
});

// Загрузка файла на сервер 
newMenuUploadFileInp.addEventListener('change', async () => {
    // Получаем первый выбранный файл (если multiple не указан)
    const file = newMenuUploadFileInp.files[0];
    if (!file) return; // пользователь нажал «Отмена»

    const res = await uploadFile(file);

    if (res) {
        const index = realDir.findIndex(f => f.name === file.name);
        if (index !== -1) realDir.splice(index, 1);

        realDir.push({
            name: file.name,
            type: "file",
            size: file.size,
            date: dateString(file.lastModified),
            url: path + file.name
        });

        renderFiles(realDir);
    }

    newMenuUploadFileInp.value = '';
});

/* --------------------- Create dir --------------------- */

// Закрыть Create
createDirDiv.addEventListener("click", (e) => {
    if (e.target === createDirDiv)
        mainContainer.classList.remove("create-dir");
});

// Открытие Create
newMenuOpenCreateDirBtn.addEventListener("click", () => {
    mainContainer.classList.remove("new-menu");
    mainContainer.classList.add("create-dir");
});

// Создать папку
createDirBtn.addEventListener("click", async () => {
    const name = createDirInp.value.trim();
    const invalid =
        !name ||
        name === "." ||
        name === ".." ||
        name.includes("/") ||
        name.includes("\\") ||
        name.includes("\0");

    if (invalid) {
        createDirInp.classList.add("red");
        setTimeout(() => {
            createDirInp.classList.remove("red");
        }, 750);
    } else {
        let res = await createDir(path + name);
        if (res && !realDir.find(f => f.name === name)) {
            realDir.push({
                name: name,
                type: "dir",
                size: null,
                date: null,
                children: [],
                url: path + name
            });

            renderFiles(realDir);
        }

        mainContainer.classList.remove("create-dir");
        createDirInp.value = '';
    }
});
