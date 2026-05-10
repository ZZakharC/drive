export const config = {
    server: {
        port: 3000, // 80 чтобы сервер открывался на host по умолчанию
        host: "192.168.0.159",
        https: {
            keyFilePath: "./server.key",
            certFilePath: "./server.crt",
        },
        salt: process.env.SALT, // Соль для хеширования пароля
        usersFile: "./users.json", // users db
        drivePath: "./storage/", // Диск
        registerOn: 1, // Включена ли регистрация (если false то /register GET/POST не будут обрабатываться)
        minLengthLogin: 4,
        minLengthPassword: 6,
        maxBodySize: 1_000_000, // 75.56 MB
        sessionTime: 86_400_000, // 24 hours
        rateLimit: {
            maxAttempts: 5, // попыток в окне
            windowMs: 900_000, // 15 минут
        },
    },
    client: {
        mainPagePath: "./client/html/drive.html", // Главная страница
        javaScriptPath: "./client/js/", // Js
        stylePath: "./client/style/", // Css
        htmlPath: "./client/html/", // Html
        imgPath: "./client/img/", // Изображения
        defaultRules: 3, // Права по умолчанию (Read + Change)
    },
}
