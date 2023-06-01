const path = require('path');
const os = require('os');
const fs = require('fs');
const resizeImg = require('resize-img');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');

// process.env.NODE_ENV = 'dev';

const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;
let aboutWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        resizable: isDev,
        title: 'Image Resizer',
        width: isDev ? 1000 : 500,
        height: 600,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    });

    // Show devtools automatically if in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

function createAboutWindow() {
    aboutWindow = new BrowserWindow({
        title: 'About Image Resizer',
        width: 300,
        height: 300,
        icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    });

    aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'));
}

app.on('ready', () => {
    createMainWindow();

    // implement menu
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    // remove mainWindow from mem on close
    mainWindow.on('close', () => (mainWindow = null))
});

const menu = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Quit',
                click: () => app.quit(),
                accelerator: 'CmdOrCtrl+W'
            }
        ],
    },
    {
        label: 'Help',
        submenu: [
            {
                label: 'About',
                click: createAboutWindow,
            }
        ],
    },
    {
        label: 'Developer',
        submenu: [
            { role: 'reload' },
            { role: 'forcereload' },
            { type: 'separator' },
            { role: 'toggledevtools' },
        ],
    },
];

ipcMain.on('image:resize', (e, options) => {
    options.dest = path.join(os.homedir(), 'imageresizer');
    resizeImage(options);
});

async function resizeImage({ imgPath, width, height, dest }) {
    try {
        const newPath = await resizeImg(fs.readFileSync(imgPath), {
            width: +width,
            height: +height,
        });

        // create filename
        const filename = path.basename(imgPath);

        // create filename if not exists
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }

        // save file
        fs.writeFileSync(path.join(dest, filename), newPath);

        // send success
        mainWindow.webContents.send('image:done');

        // show file folder
        shell.openPath(dest);
    } catch (error) {
        console.log(error)
    }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    app.quit();
});

// Open a window if none are open (macOS)
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
