document.addEventListener('DOMContentLoaded', () => {
    const newTabBtn = document.getElementById('new-tab-btn');
    const tabsContainer = document.getElementById('tabs-container');
    const urlBar = document.getElementById('url-bar');
    const backBtn = document.getElementById('back-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const homeBtn = document.getElementById('home-btn');
    const devtoolsBtn = document.getElementById('toggle-devtools-btn');

    const bookmarkBtn = document.getElementById('bookmark-btn');
    const historyBtn = document.getElementById('history-btn');
    const downloadsBtn = document.getElementById('downloads-btn');

    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    let nextTabId = 0;
    let activeViewId = null;
    
    window.electronAPI.getHomepagePath().then(homepagePath => {
        addTab(`file://${homepagePath}`);
    });

    function createTabUI(tabId, title) {
        const tab = document.createElement('div');
        tab.id = `tab-${tabId}`;
        tab.className = 'tab-item flex items-center px-4 py-2 bg-gray-100 cursor-pointer rounded-lg transition-colors';
        tab.innerHTML = `
            <span class="tab-title text-sm text-gray-700 truncate">${title}</span>
            <button class="tab-close-btn text-xs text-gray-400 hover:text-gray-600 transition-all ml-2">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        tabsContainer.appendChild(tab);

        tab.addEventListener('click', (e) => {
            if (!e.target.closest('.tab-close-btn')) {
                switchTab(tabId);
            }
        });

        const closeBtn = tab.querySelector('.tab-close-btn');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(tabId);
        });
    }

    function addTab(initialUrl = 'about:blank') {
        const tabId = nextTabId++;
        
        window.electronAPI.createNewBrowserView(tabId);
        createTabUI(tabId, 'New Tab');

        switchTab(tabId);

        if (initialUrl !== 'about:blank') {
            window.electronAPI.loadURL(initialUrl);
        }
    }

    function switchTab(tabId) {
        if (activeViewId !== null) {
            const oldTab = document.getElementById(`tab-${activeViewId}`);
            if (oldTab) {
                oldTab.classList.remove('bg-gray-200');
            }
        }
        activeViewId = tabId;
        const newTab = document.getElementById(`tab-${tabId}`);
        if (newTab) {
            newTab.classList.add('bg-gray-200');
        }
        window.electronAPI.switchBrowserView(tabId);
    }

    function closeTab(tabId) {
        const tab = document.getElementById(`tab-${tabId}`);
        if (!tab) return;
        
        let newActiveTab = null;
        if (activeViewId === tabId) {
            newActiveTab = tab.previousElementSibling || tab.nextElementSibling;
        }

        window.electronAPI.closeBrowserView(tabId);
        tabsContainer.removeChild(tab);
        
        if (newActiveTab) {
            const newActiveTabId = parseInt(newActiveTab.id.split('-')[1]);
            switchTab(newActiveTabId);
        } else if (tabsContainer.children.length === 0) {
            window.electronAPI.getHomepagePath().then(homepagePath => {
                addTab(`file://${homepagePath}`);
            });
        }
    }

    // New Tab button
    newTabBtn.addEventListener('click', () => {
        window.electronAPI.getHomepagePath().then(homepagePath => {
            addTab(`file://${homepagePath}`);
        });
    });

    // Navigation Buttons
    backBtn.addEventListener('click', () => window.electronAPI.goBack());
    forwardBtn.addEventListener('click', () => window.electronAPI.goForward());
    refreshBtn.addEventListener('click', () => window.electronAPI.refresh());
    homeBtn.addEventListener('click', () => window.electronAPI.getHomepagePath().then(homepagePath => {
        window.electronAPI.loadURL(`file://${homepagePath}`);
    }));
    devtoolsBtn.addEventListener('click', () => {
        if (activeViewId !== null) {
            window.electronAPI.toggleDevTools(activeViewId);
        }
    });
    
    minimizeBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
    maximizeBtn.addEventListener('click', () => window.electronAPI.maximizeWindow());
    closeBtn.addEventListener('click', () => window.electronAPI.closeWindow());

    // Bookmarks and History and Downloads Buttons
    bookmarkBtn.addEventListener('click', () => {
        window.electronAPI.openBookmarksWindow();
    });
    
    historyBtn.addEventListener('click', () => {
        window.electronAPI.openHistoryWindow();
    });

    downloadsBtn.addEventListener('click', () => {
        window.electronAPI.openDownloadsWindow();
    });

    urlBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            let url = urlBar.value;
            const urlPattern = /^(https?|file):\/\/[^\s$.?#].[^\s]*$/i;
            if (!urlPattern.test(url)) {
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
                window.electronAPI.loadURL(searchUrl);
            } else {
                window.electronAPI.loadURL(url);
            }
        }
    });

    window.electronAPI.onUpdateUrlBar((event, url) => {
        urlBar.value = url;
    });

    window.electronAPI.onUpdateNavigationButtons((event, { canGoBack, canGoForward }) => {
        backBtn.disabled = !canGoBack;
        forwardBtn.disabled = !canGoForward;
    });
    
    window.electronAPI.onUpdateTabTitle((event, { tabId, title }) => {
        const tabTitleSpan = document.querySelector(`#tab-${tabId} .tab-title`);
        if (tabTitleSpan) {
            tabTitleSpan.textContent = title;
        }
    });
});