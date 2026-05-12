# Drive — Cloud File Storage with Web Interface

![License](https://img.shields.io/badge/License-GPLv3-green)

🇬🇧 English (Translation) | [🇷🇺 Русский язык](./RU.md)

A local web application for file storage and management with user support, access control, and an administrative panel.
The backend is implemented in **pure** Node.js (no frameworks), while the frontend uses vanilla JavaScript + SCSS.

---

## 🚀 Features

### 🔐 Authentication

* User registration and login
* Password hashing (PBKDF2)
* Session-based access model
* Rate limiting on authentication endpoints

### 📁 File Manager

* File uploads (including drag & drop)
* Folder structure browsing
* File download and deletion
* Hierarchical file organization

### 🛡 Access Control System

Bitmask-based permission model:

* **R** — read
* **W** — write / modify
* **A** — administration

Flexible combination of permissions at the user level.

### 👥 Administration

* User management
* Access rights modification
* Account deletion

### 🔒 Security

* HTTPS (self-signed TLS certificate)
* CSRF protection
* Request rate limiting
* User data isolation

---

## 🧱 Technology Stack

| Layer   | Technologies                                              |
| ------- | --------------------------------------------------------- |
| Server  | Node.js (native modules: `https`, `fs`, `path`, `crypto`) |
| Client  | HTML5, SCSS, Vanilla JS (ES Modules)                      |
| Storage | JSON (`users.json`) + filesystem (`storage/`)             |

---

## ⚙️ Installation and Launch

### 📌 Requirements

* Node.js ≥ 18
* OpenSSL (for TLS certificate generation)

---

### 1. Clone the repository

```bash
git clone https://github.com/ZZakharC/drive.git
cd drive
```

---

### 2. Generate TLS certificate

The application uses HTTPS and requires `server.key` and `server.crt`:

```bash
openssl req -x509 -newkey rsa:4096 \
  -keyout server.key \
  -out server.crt \
  -days 365 \
  -nodes \
  -subj "/CN=localhost"
```

---

### 3. Start the server

```bash
node server.js
```

By default, the application is available at:

```
https://localhost:3000
```

Configuration:

```
server/config.js
```

It defines:

* server port
* storage paths
* request limits
* session lifetime
* registration enable/disable flag
* etc.

---

### 4. First launch

* Open the web interface in a browser
* Register a user (if `registerOn` is enabled)
* Default: `R+W` rights, but **first user will get all rights**!

---

## 📂 Project Architecture

```
drive/
├── client/
│   ├── html/        # pages (login, register, drive, admin)
│   ├── js/          # frontend logic (auth, file manager, admin)
│   ├── scss/        # source styles
│   ├── style/       # compiled CSS
│   └── img/         # file icons
│
├── server/
│   ├── app.js       # HTTP(S) routing
│   ├── config.js    # application configuration
│   ├── drive.js     # file operations
│   ├── users.js     # users and sessions
│   └── tools.js     # utilities (hashing, validation, rate limiting)
│
├── storage/         # user files
├── users.json       # user database
├── server.key       # TLS key
├── server.crt       # TLS certificate
└── server.js        # entry point
```

---

## 🔐 Permission Model (Bitmask)

| Bit | Permission |
| --- | ---------- |
| 1   | Read (R)   |
| 2   | Write (W)  |
| 4   | Admin (A)  |

Examples:

* `3` = R + W
* `7` = R + W + A

---

## 🧩 Implementation Highlights

* Fully custom backend
* File-based storage without a database
* Minimalistic frontend without frameworks
* Manual implementation of:

  * routing
  * sessions
  * authentication
  * ACL (access control)

---

## Support the Project

[![Donate](https://img.shields.io/badge/Donate-Support%20project-007BFF?style=for-the-badge)](https://pay.cloudtips.ru/p/204a4487)

---

## 📄 License

GNU GPL v3 — see [LICENSE](LICENSE)
