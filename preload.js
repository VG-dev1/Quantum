const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    createNewBrowserView: (tabId) => ipcRenderer.send('create-new-browser-view', tabId),
    switchBrowserView: (tabId) => ipcRenderer.send('switch-browser-view', tabId),
    closeBrowserView: (tabId) => ipcRenderer.send('close-browser-view', tabId),
    loadURL: (url) => ipcRenderer.send('load-url', url),
    
    goBack: () => ipcRenderer.send('go-back'),
    goForward: () => ipcRenderer.send('go-forward'),
    refresh: () => ipcRenderer.send('refresh'),
    
    onUpdateUrlBar: (callback) => ipcRenderer.on('update-url-bar', callback),
    onUpdateNavigationButtons: (callback) => ipcRenderer.on('update-navigation-buttons', callback),
    onUpdateTabTitle: (callback) => ipcRenderer.on('update-tab-title', callback),
    
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    maximizeWindow: () => ipcRenderer.send('maximize-window'),
    closeWindow: () => ipcRenderer.send('close-window'),

    getHomepagePath: () => ipcRenderer.invoke('get-homepage-path'),
    
    toggleDevTools: (viewId) => ipcRenderer.send('toggle-devtools', viewId),

    // Bookmarks Channels
    openBookmarksWindow: () => ipcRenderer.send('open-bookmarks-window'),
    addBookmark: () => ipcRenderer.send('add-bookmark'),
    removeBookmark: (url) => ipcRenderer.send('remove-bookmark', url),
    requestBookmarks: () => ipcRenderer.send('request-bookmarks'),
    onUpdateBookmarks: (callback) => ipcRenderer.on('update-bookmarks', callback),
    loadBookmarkInMain: (url) => ipcRenderer.send('load-bookmark-in-main', url),
    closeBookmarksWindow: () => ipcRenderer.send('close-bookmarks-window'),
    
    // History Channels
    openHistoryWindow: () => ipcRenderer.send('open-history-window'),
    requestHistory: () => ipcRenderer.send('request-history'),
    onUpdateHistory: (callback) => ipcRenderer.on('update-history', callback),
    clearAllHistory: () => ipcRenderer.send('clear-all-history'),
    removeHistoryItem: (url) => ipcRenderer.send('remove-history-item', url),
    loadHistoryInMain: (url) => ipcRenderer.send('load-history-in-main', url),
    closeHistoryWindow: () => ipcRenderer.send('close-history-window'),

    // Downloads Channels
    openDownloadsWindow: () => ipcRenderer.send('open-downloads-window'),
    requestDownloads: () => ipcRenderer.send('request-downloads'),
    onUpdateDownloads: (callback) => ipcRenderer.on('update-downloads', callback),
    clearAllDownloads: () => ipcRenderer.send('clear-all-downloads'),
    removeDownloadItem: (id) => ipcRenderer.send('remove-download-item', id),
    pauseDownload: (id) => ipcRenderer.send('pause-download', id),
    resumeDownload: (id) => ipcRenderer.send('resume-download', id),
    cancelDownload: (id) => ipcRenderer.send('cancel-download', id),
    showDownloadInFolder: (path) => ipcRenderer.send('show-download-in-folder', path),
});