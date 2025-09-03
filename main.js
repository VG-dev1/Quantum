const { app, BrowserWindow, ipcMain, BrowserView, Menu, session, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const browserViews = new Map();
let activeViewId = null;
let activeView = null;
let bookmarksWindow = null;
let historyWindow = null;
let downloadsWindow = null;
let isDownloadingManually = false;

const bookmarksPath = path.join(app.getPath('userData'), 'bookmarks.json');
let bookmarks = [];

const historyPath = path.join(app.getPath('userData'), 'history.json');
let history = [];

const downloadsPath = path.join(app.getPath('userData'), 'downloads.json');
let downloads = [];

const activeDownloadItems = new Map();

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
    
    mainWindow.on('resize', updateBrowserViewBounds);

    loadBookmarks();
    loadHistory();
    loadDownloads();
};

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // FINAL & CORRECTED: Download Handler
    session.defaultSession.on('will-download', (event, item, webContents) => {
        const downloadUrl = item.getURL();
        const initialFilename = item.getFilename();
        const initialBytes = item.getReceivedBytes();

        // FINAL FIX: This check is crucial. If the download was initiated by us, don't show a dialog.
        if (isDownloadingManually) {
            isDownloadingManually = false; // Reset the flag immediately

            const id = downloadUrl;
            activeDownloadItems.set(id, item);

            const downloadData = {
                id,
                filename: initialFilename,
                path: item.getSavePath(),
                state: 'progressing',
                receivedBytes: initialBytes,
                totalBytes: item.getTotalBytes(),
            };
            downloads.push(downloadData);
            sendDownloadsToWindow();
            saveDownloads();

            item.on('updated', (event, state) => {
                const index = downloads.findIndex(d => d.id === id);
                if (index !== -1) {
                    downloads[index].receivedBytes = item.getReceivedBytes();
                    downloads[index].state = state;
                    sendDownloadsToWindow();
                }
            });

            item.on('done', (event, state) => {
                const index = downloads.findIndex(d => d.id === id);
                if (index !== -1) {
                    downloads[index].state = state;
                    downloads[index].receivedBytes = item.getReceivedBytes();
                    saveDownloads();
                    sendDownloadsToWindow();
                }
                activeDownloadItems.delete(id);
            });

            return;
        }

        // This is a new, user-initiated download. We must get a save path.
        event.preventDefault();

        dialog.showSaveDialog(mainWindow, {
            title: 'Save File',
            defaultPath: initialFilename,
        }).then(result => {
            if (result.canceled) {
                console.log('Download cancelled by user.');
                return;
            }

            const savePath = result.filePath;
            isDownloadingManually = true; // Set the flag right before initiating the download
            session.defaultSession.downloadURL(downloadUrl, { savePath: savePath });

        }).catch(err => {
            console.error('Error showing save dialog:', err);
        });
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function loadBookmarks() {
    if (fs.existsSync(bookmarksPath)) {
        try {
            const data = fs.readFileSync(bookmarksPath, 'utf8');
            bookmarks = JSON.parse(data);
        } catch (e) {
            console.error('Failed to read bookmarks file', e);
        }
    }
}

function saveBookmarks() {
    try {
        fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save bookmarks file', e);
    }
}

function sendBookmarksToWindow() {
    if (bookmarksWindow) {
        bookmarksWindow.webContents.send('update-bookmarks', bookmarks);
    }
}

function loadHistory() {
    if (fs.existsSync(historyPath)) {
        try {
            const data = fs.readFileSync(historyPath, 'utf8');
            history = JSON.parse(data);
        } catch (e) {
            console.error('Failed to read history file', e);
        }
    }
}

function saveHistory() {
    try {
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save history file', e);
    }
}

function sendHistoryToWindow() {
    if (historyWindow) {
        historyWindow.webContents.send('update-history', history);
    }
}

function loadDownloads() {
    if (fs.existsSync(downloadsPath)) {
        try {
            const data = fs.readFileSync(downloadsPath, 'utf8');
            downloads = JSON.parse(data);
        } catch (e) {
            console.error('Failed to read downloads file', e);
        }
    }
}

function saveDownloads() {
    try {
        fs.writeFileSync(downloadsPath, JSON.stringify(downloads, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save downloads file', e);
    }
}

function sendDownloadsToWindow() {
    if (downloadsWindow) {
        downloadsWindow.webContents.send('update-downloads', downloads);
    }
}

function updateBrowserViewBounds() {
    if (activeView) {
        const { width, height } = mainWindow.getContentBounds();
        
        const titleBarHeight = 32;
        const topUiContainerHeight = 80;
        const bodyPadding = 8;
        const sidebarWidth = 64;

        const xOffset = bodyPadding;
        const yOffset = titleBarHeight + topUiContainerHeight + bodyPadding;
        
        const viewWidth = width - sidebarWidth - bodyPadding * 2;
        const viewHeight = height - yOffset - bodyPadding;
        
        activeView.setBounds({
            x: xOffset,
            y: yOffset,
            width: viewWidth,
            height: viewHeight
        });
    }
}

// IPC Handlers
ipcMain.on('create-new-browser-view', (event, tabId) => {
    const view = new BrowserView({
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
        },
    });
    
    browserViews.set(tabId, view);
    
    view.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('update-url-bar', view.webContents.getURL());
        mainWindow.webContents.send('update-tab-title', { tabId: tabId, title: view.webContents.getTitle() });
        
        const url = view.webContents.getURL();
        const title = view.webContents.getTitle();
        if (url !== 'about:blank' && !url.startsWith('file://')) {
            const newHistoryItem = { title: title, url: url, timestamp: new Date().toISOString() };
            if (history.length > 0 && history[history.length - 1].url === url) {
                // Don't save if it's the same URL as the last entry
            } else {
                history.push(newHistoryItem);
                saveHistory();
            }
        }
    });

    view.webContents.on('did-navigate', () => {
        mainWindow.webContents.send('update-url-bar', view.webContents.getURL());
    });

    view.webContents.on('did-start-loading', () => {
        mainWindow.webContents.send('update-navigation-buttons', {
            canGoBack: view.webContents.navigationHistory.canGoBack(),
            canGoForward: view.webContents.navigationHistory.canGoForward(),
        });
    });

    view.webContents.on('context-menu', (event, params) => {
        const menuTemplate = [
            {
                label: 'Go Back',
                enabled: view.webContents.navigationHistory.canGoBack(),
                click: () => view.webContents.goBack(),
            },
            {
                label: 'Go Forward',
                enabled: view.webContents.navigationHistory.canGoForward(),
                click: () => view.webContents.goForward(),
            },
            {
                label: 'Reload',
                click: () => view.webContents.reload(),
            },
            {
                type: 'separator',
            },
            {
                label: 'Cut',
                enabled: params.editFlags.canCut,
                click: () => view.webContents.cut(),
            },
            {
                label: 'Copy',
                enabled: params.editFlags.canCopy,
                click: () => view.webContents.copy(),
            },
            {
                label: 'Paste',
                enabled: params.editFlags.canPaste,
                click: () => view.webContents.paste(),
            },
            {
                label: 'Select All',
                enabled: params.editFlags.canSelectAll,
                click: () => view.webContents.selectAll(),
            },
            {
                type: 'separator',
            },
            {
                label: 'Inspect Element',
                click: () => view.webContents.inspectElement(params.x, params.y),
            },
        ];

        const menu = Menu.buildFromTemplate(menuTemplate);
        menu.popup({ window: BrowserWindow.fromWebContents(view.webContents) });
    });
});

ipcMain.on('switch-browser-view', (event, tabId) => {
    const view = browserViews.get(tabId);
    if (view) {
        mainWindow.setBrowserView(view);
        activeView = view;
        activeViewId = tabId;
        updateBrowserViewBounds();
        
        mainWindow.webContents.send('update-url-bar', view.webContents.getURL());
        view.webContents.focus();
    }
});

ipcMain.on('close-browser-view', (event, tabId) => {
    const view = browserViews.get(tabId);
    if (view && !view.webContents.isDestroyed()) {
        if (activeView === view) {
            mainWindow.setBrowserView(null);
            activeView = null;
        }
        try {
            view.destroy();
        } catch (e) {
            console.error('Failed to destroy browser view:', e);
        }
    }
    browserViews.delete(tabId);
});

ipcMain.on('load-url', (event, url) => {
    if (activeView) {
        activeView.webContents.loadURL(url);
        activeView.webContents.focus();
    }
});

ipcMain.on('go-back', () => {
    if (activeView && activeView.webContents.navigationHistory.canGoBack()) {
        activeView.webContents.goBack();
        activeView.webContents.focus();
    }
});

ipcMain.on('go-forward', () => {
    if (activeView && activeView.webContents.navigationHistory.canGoForward()) {
        activeView.webContents.goForward();
        activeView.webContents.focus();
    }
});

ipcMain.on('refresh', () => {
    if (activeView) {
        activeView.webContents.reload();
        activeView.webContents.focus();
    }
});

ipcMain.handle('get-homepage-path', async () => {
    return path.join(__dirname, 'src', 'homepage.html');
});

ipcMain.on('toggle-devtools', (event, viewId) => {
    const view = browserViews.get(viewId);
    if (view) {
        if (view.webContents.isDevToolsOpened()) {
            view.webContents.closeDevTools();
        } else {
            view.webContents.openDevTools();
        }
    }
});

ipcMain.on('minimize-window', () => {
    mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.on('close-window', () => {
    mainWindow.close();
});

// Bookmarks Feature IPC Handlers
ipcMain.on('open-bookmarks-window', () => {
    if (bookmarksWindow) {
        bookmarksWindow.focus();
        return;
    }

    bookmarksWindow = new BrowserWindow({
        width: 400,
        height: 600,
        frame: false,
        transparent: true,
        parent: mainWindow,
        modal: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    bookmarksWindow.loadFile(path.join(__dirname, 'src', 'bookmarks.html'));

    bookmarksWindow.once('ready-to-show', () => {
        bookmarksWindow.show();
        sendBookmarksToWindow();
    });

    bookmarksWindow.on('closed', () => {
        bookmarksWindow = null;
    });
});

ipcMain.on('add-bookmark', (event) => {
    if (activeView) {
        const url = activeView.webContents.getURL();
        const title = activeView.webContents.getTitle();
        const newBookmark = { title, url };
        
        if (!bookmarks.some(b => b.url === url)) {
            bookmarks.push(newBookmark);
            saveBookmarks();
            sendBookmarksToWindow();
        }
    }
});

ipcMain.on('remove-bookmark', (event, url) => {
    bookmarks = bookmarks.filter(b => b.url !== url);
    saveBookmarks();
    sendBookmarksToWindow();
});

ipcMain.on('request-bookmarks', () => {
    sendBookmarksToWindow();
});

ipcMain.on('load-bookmark-in-main', (event, url) => {
    if (activeView) {
        activeView.webContents.loadURL(url);
    }
    if (bookmarksWindow) {
        bookmarksWindow.close();
    }
});

ipcMain.on('close-bookmarks-window', () => {
    if (bookmarksWindow) {
        bookmarksWindow.close();
    }
});

// History Feature IPC Handlers
ipcMain.on('open-history-window', () => {
    if (historyWindow) {
        historyWindow.focus();
        return;
    }

    historyWindow = new BrowserWindow({
        width: 400,
        height: 600,
        frame: false,
        transparent: true,
        parent: mainWindow,
        modal: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    historyWindow.loadFile(path.join(__dirname, 'src', 'history.html'));

    historyWindow.once('ready-to-show', () => {
        historyWindow.show();
        sendHistoryToWindow();
    });

    historyWindow.on('closed', () => {
        historyWindow = null;
    });
});

ipcMain.on('request-history', () => {
    sendHistoryToWindow();
});

ipcMain.on('clear-all-history', () => {
    history = [];
    saveHistory();
    sendHistoryToWindow();
});

ipcMain.on('remove-history-item', (event, urlToRemove) => {
    history = history.filter(item => item.url !== urlToRemove);
    saveHistory();
    sendHistoryToWindow();
});

ipcMain.on('load-history-in-main', (event, url) => {
    if (activeView) {
        activeView.webContents.loadURL(url);
    }
    if (historyWindow) {
        historyWindow.close();
    }
});

ipcMain.on('close-history-window', () => {
    if (historyWindow) {
        historyWindow.close();
    }
});

// Downloads Feature IPC Handlers
ipcMain.on('open-downloads-window', () => {
    if (downloadsWindow) {
        downloadsWindow.focus();
        return;
    }

    downloadsWindow = new BrowserWindow({
        width: 400,
        height: 600,
        frame: false,
        transparent: true,
        parent: mainWindow,
        modal: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    downloadsWindow.loadFile(path.join(__dirname, 'src', 'downloads.html'));

    downloadsWindow.once('ready-to-show', () => {
        downloadsWindow.show();
        sendDownloadsToWindow();
    });

    downloadsWindow.on('closed', () => {
        downloadsWindow = null;
    });
});

ipcMain.on('request-downloads', () => {
    sendDownloadsToWindow();
});

ipcMain.on('clear-all-downloads', () => {
    downloads = [];
    saveDownloads();
    sendDownloadsToWindow();
});

ipcMain.on('remove-download-item', (event, id) => {
    downloads = downloads.filter(d => d.id !== id);
    saveDownloads();
    sendDownloadsToWindow();
});

ipcMain.on('pause-download', (event, id) => {
    const downloadItem = activeDownloadItems.get(id);
    if (downloadItem && downloadItem.isPaused() === false) {
        downloadItem.pause();
        const index = downloads.findIndex(d => d.id === id);
        if (index !== -1) {
            downloads[index].state = 'paused';
            sendDownloadsToWindow();
        }
    }
});

ipcMain.on('resume-download', (event, id) => {
    const downloadItem = activeDownloadItems.get(id);
    if (downloadItem && downloadItem.isPaused()) {
        downloadItem.resume();
        const index = downloads.findIndex(d => d.id === id);
        if (index !== -1) {
            downloads[index].state = 'progressing';
            sendDownloadsToWindow();
        }
    }
});

ipcMain.on('cancel-download', (event, id) => {
    const downloadItem = activeDownloadItems.get(id);
    if (downloadItem) {
        downloadItem.cancel();
    }
});

ipcMain.on('show-download-in-folder', (event, filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        shell.showItemInFolder(filePath);
    } else {
        if (downloadsWindow) {
            downloadsWindow.webContents.send('show-alert', 'File not found. It may have been moved or deleted.');
        }
    }
});

ipcMain.on('close-downloads-window', () => {
    if (downloadsWindow) {
        downloadsWindow.close();
    }
});