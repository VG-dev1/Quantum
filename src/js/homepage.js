document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('homepage-search');
    const addShortcutBtn = document.getElementById('add-shortcut-btn');
    const shortcutsContainer = document.getElementById('shortcuts-container');
    const shortcutDialog = document.getElementById('shortcut-dialog');
    const addShortcutCancel = document.getElementById('add-shortcut-cancel');
    const addShortcutConfirm = document.getElementById('add-shortcut-confirm');
    const shortcutNameInput = document.getElementById('shortcut-name-input');
    const shortcutUrlInput = document.getElementById('shortcut-url-input');

    const deleteShortcutDialog = document.getElementById('delete-shortcut-dialog');
    const deleteShortcutConfirmBtn = document.getElementById('delete-shortcut-confirm-btn');
    const deleteShortcutCancelBtn = document.getElementById('delete-shortcut-cancel-btn');

    let shortcutToDeleteUrl = null; 

    function getShortcuts() {
        try {
            const shortcuts = JSON.parse(localStorage.getItem('shortcuts')) || [];
            return shortcuts;
        } catch (e) {
            console.error('Failed to parse shortcuts from localStorage', e);
            return [];
        }
    }

    function saveShortcuts(shortcuts) {
        localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
    }

    function deleteShortcut(urlToDelete) {
        let shortcuts = getShortcuts();
        shortcuts = shortcuts.filter(shortcut => shortcut.url !== urlToDelete);
        saveShortcuts(shortcuts);
        renderShortcuts();
    }

    function renderShortcuts() {
        const shortcuts = getShortcuts();
        const addBtn = document.getElementById('add-shortcut-btn');
        shortcutsContainer.innerHTML = '';
        shortcutsContainer.appendChild(addBtn);

        shortcuts.forEach(shortcut => {
            const shortcutAnchor = document.createElement('a');
            shortcutAnchor.href = shortcut.url;
            shortcutAnchor.className = 'shortcut-item no-drag-region';
            
            const shortcutDiv = document.createElement('div');
            shortcutDiv.className = 'shortcut-item flex flex-col items-center justify-center w-24 h-24 p-2 bg-white rounded-lg hover:bg-gray-100 transition-all';
            
            // NEW: Use an <img> tag to display the favicon.
            // The onerror attribute will fall back to the generic link icon if the favicon fails to load.
            shortcutDiv.innerHTML = `
                <div class="shortcut-icon flex items-center justify-center w-12 h-12 bg-gray-200 text-gray-600 rounded-full text-2xl font-bold">
                    <img src="https://t0.gstatic.com/faviconV2?client=SOCIAL&url=${encodeURIComponent(shortcut.url)}&sz=128" 
                         alt="Favicon" class="w-12 h-12 rounded-full"
                         onerror="this.onerror=null; this.src='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/svgs/solid/link.svg'; this.classList.remove('rounded-full'); this.style.width='1.5rem'; this.style.height='1.5rem';">
                </div>
                <span class="mt-2 text-sm text-gray-700 truncate w-full text-center">${shortcut.name}</span>
            `;

            shortcutDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault(); 
                shortcutToDeleteUrl = shortcut.url; 
                deleteShortcutDialog.classList.remove('hidden');
            });

            shortcutAnchor.appendChild(shortcutDiv);
            shortcutsContainer.appendChild(shortcutAnchor);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                }
            }
        });
    }

    if (addShortcutBtn && shortcutDialog) {
        addShortcutBtn.addEventListener('click', () => {
            shortcutDialog.classList.remove('hidden');
        });

        addShortcutCancel.addEventListener('click', () => {
            shortcutDialog.classList.add('hidden');
            shortcutNameInput.value = '';
            shortcutUrlInput.value = '';
        });

        addShortcutConfirm.addEventListener('click', () => {
            const name = shortcutNameInput.value.trim();
            const url = shortcutUrlInput.value.trim();
            if (name && url) {
                const shortcuts = getShortcuts();
                shortcuts.push({ name, url });
                saveShortcuts(shortcuts);
                renderShortcuts();
                
                shortcutDialog.classList.add('hidden');
                shortcutNameInput.value = '';
                shortcutUrlInput.value = '';
            } else {
                alert('Please fill in both fields.');
            }
        });
    }

    deleteShortcutConfirmBtn.addEventListener('click', () => {
        if (shortcutToDeleteUrl) {
            deleteShortcut(shortcutToDeleteUrl);
            shortcutToDeleteUrl = null; 
        }
        deleteShortcutDialog.classList.add('hidden');
    });

    deleteShortcutCancelBtn.addEventListener('click', () => {
        shortcutToDeleteUrl = null; 
        deleteShortcutDialog.classList.add('hidden');
    });

    renderShortcuts();
});