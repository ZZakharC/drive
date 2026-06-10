import { config } from "/js/config.js";
import { server } from "/js/server.js";

/* -------------------- User session -------------------- */

let user = null;

const usrRulesSpn = document.getElementById("rules_spn");
const usrNameSpn = document.getElementById("name_spn");
const adminPanelSpn = document.getElementById("admin_panel_btn");

// Старт скрипта
// Заполнения данных о пользователе и рендер файлов
(async () => {
    const res = await server.authUser();
    const pth = new URLSearchParams(window.location.search).get("path");

    if (pth)
        path = pth;

    if (!res)
        alert("Error: auth");
    else {
        // Устанавливаем user
        user = res.user;

        // Рендер файлов
        renderFiles();

        // Если не в корневой папке отображаем кнопку и обновляем spn
        if (path != "/") {
            upDirBtn.classList.remove("off");
            pathSpn.textContent = path;
        }

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
        usrNameSpn.addEventListener("click", () => { if (confirm(`Выйти из аккаунта ${user.name}?`)) server.logoutUser() });
        usrRulesSpn.textContent = rules;
    }
})();

/* ----------------------- Drive ------------------------ */

let path = "/";
const activeUploads = new Set();

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
const previewDeleteBtn = document.getElementById("preview_delete_btn");

// Меню файла
const fileMenuDiv = document.getElementById('file_menu_div');
const fileMenuDownloadBtn = document.getElementById('file_menu_download_btn');
const fileMenuDeleteBtn = document.getElementById('file_menu_delete_btn');

// Меню добавления
const newMenuOpenBtn = document.getElementById("new_menu_open_btn");
const newMenuDiv = document.getElementById('new_menu_div');
const newMenuOpenCreateDirBtn = document.getElementById('new_menu_open_create_dir_btn');
// Загрузка файлов
const newMenuUploadFileBtn = document.getElementById('upload_file_btn');
const newMenuUploadFileInp = document.getElementById('upload_file_inp');
// Создание папки
const createDirDiv = document.getElementById('create_dir_div');
const createDirBtn = document.getElementById('create_dir_btn');
const createDirInp = document.getElementById('create_dir_inp');

// Список загружаемых файлов
const downloadListDiv = document.getElementById('download_list_div');
const downloadListCloseBtn = document.getElementById('download_list_close_btn');
const downloadListContainer = document.getElementById('download_list_container');

// Инфо о файле в bottom-bar
const bottomNameSpn = document.getElementById("file_name_spn");
const bottomTypeSpn = document.getElementById("file_type_spn");
const bottomSizeSpn = document.getElementById("file_size_spn");
const bottomDateSpn = document.getElementById("file_data_spn");

/* --------------------- Server API --------------------- */

// Отмена всех загрузок на сервер
function cancelAllUploads() {
    for (const xhr of activeUploads)
        xhr.abort();

    activeUploads.clear();
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

            history.replaceState({}, "", `?path=${file.url}`);

            renderFiles();
        });
    }
    // Event файла
    else {
        file_block.addEventListener("dblclick", () => {
            previewNameSpn.textContent = file.name;

            // Настройка изображения
            previewImage(file, ext, img.src);

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
async function renderFiles() {
    const files = await server.listFiles(path);

    if (files) {
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

        fContainer.innerText = "";
        files.forEach(file => {
            renderFile(file);
        });
    } else {
        history.replaceState({}, "", "?path=/");
        alert("ERROR");
    }
}

/* ------------------------ Path ------------------------ */

// Подняться на папку в верх
upDirBtn.addEventListener("click", () => {
    if (!path || path === "/") return;

    // убираем последний сегмент
    let parts = path.split("/").filter(Boolean);
    parts.pop();

    path = "/" + parts.join("/");

    pathSpn.textContent = path;

    history.replaceState({}, "", `?path=${path}`);

    // Выключаем кнопку если мы в корне /
    if (path === "/")
        upDirBtn.classList.add("off");

    // перерисовка
    renderFiles();
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
            const prog = downloadListAdd(file.name);
            let res = await server.uploadFile(activeUploads, path, file, (p) => {
                downloadListUpdate(p, prog.progress, prog.percent);
            });
        }

        renderFiles();
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
    server.downloadFile(previewDownloadBtn.url);
});

// Удалить файл
previewDeleteBtn.addEventListener("click", async () => {
    if (!confirm(`Удалить файл ${previewDeleteBtn.url}?`)) return;

    const res = await server.deleteFile(previewDeleteBtn.url);
    if (res)
        renderFiles();
});


// Настройка изображения
function previewImage(file, type, defaultSrc) {
    previewImg.className = "";

    if (!config.imagesRender.includes(type) || file.size > config.maxImageRenderSize)
        previewImg.src = defaultSrc;
    else {
        previewImg.src = server.downloadFileUrl(file.url);
        previewImg.classList.add("image");

        previewImg.onerror = () => {
            previewImg.onerror = null; // Защита от зацикливания
            previewImg.src = defaultSrc;
            previewImg.classList.remove("image");
        };
    }
}

// Нажатие на изображения
previewImg.addEventListener("click", () => { previewImg.classList.toggle("zoom"); });

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
        server.downloadFile(file.url);
        mainContainer.classList.remove("file-menu");
    };

    fileMenuDeleteBtn.onclick = async () => {
        if (!confirm(`Удалить ${file.url}?`)) return;
        const res = await server.deleteFile(file.url);
        if (res)
            renderFiles();

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

    const prog = downloadListAdd(file.name);
    let res = await server.uploadFile(activeUploads, path, file, (p) => {
        downloadListUpdate(p, prog.progress, prog.percent);
    });

    if (res)
        renderFiles();

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
        let res = await server.createDir(path + name);
        if (res)
            renderFiles();

        mainContainer.classList.remove("create-dir");
        createDirInp.value = '';
    }
});

/* ------------------- Download list -------------------- */

downloadListCloseBtn.addEventListener("click", () => {
    if (activeUploads.size !== 0 && // Если есть активные загрузки
        !confirm(`Отменить все загрузки?`)
    ) return;

    cancelAllUploads();
    downloadListContainer.innerText = "";
    mainContainer.classList.remove("download-list");
});

function downloadListAdd(name) {
    const ext = name.split('.').pop().toLowerCase();

    const file = document.createElement("div");
    file.classList.add("file");

    const img = document.createElement("img");
    img.src = `img/${config.file_map[ext] || config.file_map["default"]}.png`;

    const fName = document.createElement("span");
    fName.textContent = name;
    fName.classList.add("name");

    const progress = document.createElement("progress");
    progress.max = 100;
    progress.value = 0

    const percent = document.createElement("span");
    percent.textContent = "0%";
    percent.classList.add("percent");

    file.appendChild(img);
    file.appendChild(fName);
    file.appendChild(progress);
    file.appendChild(percent);

    downloadListContainer.appendChild(file);
    mainContainer.classList.add("download-list");

    return { progress, percent };
}

function downloadListUpdate(p, progress, percent) {
    percent.textContent = p.percent + "%";
    progress.value = p.percent;

    if (p.percent == 100) {
        progress.classList.add("finish");
        percent.classList.add("finish");
    }
}
