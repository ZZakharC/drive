export const config = {
    server: {
        "url": "https://localhost:3000/",
    },
    minLengthLogin: 4,
    minLengthPassword: 6,
    rule: {
        READ: 1,
        CHANGE: 2,
        ADMIN: 4,
    },
    rule_map: [
            { bit: 1, label: "R" },
            { bit: 2, label: "C" },
            { bit: 4, label: "A" }
    ],
    file_map: {
        "default": "file",
        "folder": "folder",
        "png": "jpg",
        "jpg": "jpg",
        "jpeg": "jpg",
        "zip": "zip",
        "rar": "rar",
        "txt": "txt",
        "pdf": "pdf",
        "html": "html",
        "mp4": "mp4",
        "exe": "exe",
        "iso": "iso",
        "svg": "svg"
    },

}
