document.addEventListener('DOMContentLoaded', () => {
    const bookmarksGrid = document.getElementById('bookmarks-grid');
    const closeBtn = document.getElementById('close-btn');

    function getBookmarks() {
        try {
            return JSON.parse(localStorage.getItem('bookmarks')) || [];
        } catch (e) {
            console.error('Failed to parse bookmarks from localStorage', e);
            return [];
        }
    }

    function renderBookmarks() {
        bookmarksGrid.innerHTML = '';
        const bookmarks = getBookmarks();
        
        if (bookmarks.length === 0) {
            bookmarksGrid.innerHTML = '<span class="text-sm text-gray-500 p-2 col-span-3 text-center">No bookmarks yet.</span>';
        } else {
            bookmarks.forEach(bookmark => {
                const bookmarkItem = document.createElement('button');
                bookmarkItem.className = 'flex flex-col items-center p-2 rounded-lg hover:bg-gray-200 transition-colors no-drag-region';
                bookmarkItem.innerHTML = `
                    <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                        <img src="https://t0.gstatic.com/faviconV2?client=SOCIAL&url=${encodeURIComponent(bookmark.url)}&sz=64" 
                             alt="Favicon" class="w-10 h-10 rounded-full"
                             onerror="this.onerror=null; this.src='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/svgs/solid/bookmark.svg'; this.classList.remove('rounded-full'); this.style.width='1.5rem'; this.style.height='1.5rem';">
                    </div>
                    <span class="text-xs text-gray-700 truncate w-full text-center">${bookmark.title}</span>
                `;
                bookmarkItem.addEventListener('click', () => {
                    // Send message to main process to load the URL in the main window
                    window.electronAPI.loadBookmarkInMain(bookmark.url);
                });
                bookmarksGrid.appendChild(bookmarkItem);
            });
        }
    }

    // Close the window
    closeBtn.addEventListener('click', () => {
        window.close();
    });

    renderBookmarks();
});