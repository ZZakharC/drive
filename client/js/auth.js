import { config } from "/js/config.js";
import { server } from "/js/server.js";

const login_inp = document.getElementById("login_inp");
const password_inp = document.getElementById("password_inp");
const password2_inp = document.getElementById("password2_inp"); // может быть null
const password_btn = document.getElementById("password_btn");
const text_spn = document.getElementById("text_spn");

const register_btn = document.getElementById("register_btn"); // может быть null
const login_btn = document.getElementById("login_btn"); // может быть null

// Для валидации
const loginRegex = /^[a-zA-Z0-9._-]{4,50}$/;
const passwordRegex = /^[\x20-\x7E]{6,100}$/;

function validateCredentials(login, password) {
    if (!loginRegex.test(login))
        return "Некорректный логин";

    if (!passwordRegex.test(password))
        return "Некорректный пароль";

    return null;
}

// Показ/скрытие пароля
password_btn.onclick = () => {
    password_inp.type = password_inp.type === "text" ? "password" : "text";
};

// Проверка совпадения паролей (только для регистрации)
if (password2_inp) {
    password2_inp.addEventListener("input", () => {
        text_spn.textContent =
            password_inp.value !== password2_inp.value
                ? "Пароли не совпадают"
                : "";
    });
}

// Регистрация
if (register_btn) {
    register_btn.onclick = async () => {
        if (login_inp.value.length < config.minLengthLogin) {
            text_spn.textContent = "Длина логина должна быть больше " + config.minLengthLogin;
            return;
        }

        if (password_inp.value.length < config.minLengthPassword) {
            text_spn.textContent = "Длина пароля должна быть больше " + config.minLengthPassword;
            return;
        }

        if (password_inp.value !== password2_inp.value) {
            text_spn.textContent = "Пароли не совпадают";
            return;
        }

        const error = validateCredentials(login_inp.value, password_inp.value);
        if (error) {
            text_spn.textContent = error;
            return;
        }

        text_spn.textContent = "";

        let res = await server.registerUser(login_inp.value, password_inp.value);

        if (res.ok)
            location.href = "/";
        else if (res.code === 409)
            text_spn.textContent = "Пользователь уже существует";
        else if (res.code === 429)
            text_spn.textContent = "Слишком много попыток, попробуйте позже";
        else
            text_spn.textContent = "Неизвестная ошибка: " + res.code;
    };
}

// Логин
if (login_btn) {
    login_btn.onclick = async () => {
        if (login_inp.value.length < config.minLengthLogin) {
            text_spn.textContent = "Длина логина должна быть больше " + config.minLengthLogin;
            return;
        }

        if (password_inp.value.length < config.minLengthPassword) {
            text_spn.textContent = "Длина пароля должна быть больше " + config.minLengthPassword;
            return;
        }

        const error = validateCredentials(login_inp.value, password_inp.value);
        if (error) {
            text_spn.textContent = error;
            return;
        }

        text_spn.textContent = "";

        let res = await server.loginUser(login_inp.value, password_inp.value);

        if (res.ok)
            location.href = "/";
        else if (res.code === 401)
            text_spn.textContent = "Неверный логин или пароль";
        else if (res.code === 429)
            text_spn.textContent = "Слишком много попыток, попробуйте позже";
        else
            text_spn.textContent = "Неизвестная ошибка: " + res.code;
    };
}
