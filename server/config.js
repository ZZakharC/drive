export const config = {
    server: {
        port: 3000, // 443 чтобы сервер открывался на host по умолчанию
        host: "localhost",
        https: {
            keyFilePath: "./server.key",
            certFilePath: "./server.crt",
        },
        usersFile: "./users.json", // users db
        drivePath: "./storage/", // Диск
        registerOn: true, // Включена ли регистрация (если false то /register GET/POST не будут обрабатываться)
        checkIP: true, // Проверять ли IP пользователя с IP в сессии
        minLengthLogin: 4,
        minLengthPassword: 6,
        hashPassword: {
            iterations: 500_000,
            hashLength: 64,
            saltLength: 32,
            method: "sha512",
        },
        maxFileSize: 10737418240, // 10 GB
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
