/* ==========================================================================
   MUN Research Hub - Clean & Responsive Vanilla JS Engine
   ========================================================================== */

(function () {
    'use strict';

    // Application state
    let files = [];
    let fileMap = new Map();
    let currentFile = null;
    let selectedCommittee = 'all';
    let searchQuery = '';

    // DOM Elements
    const elements = {
        themeToggle: document.getElementById('themeToggle'),
        committeeSelect: document.getElementById('committeeSelect'),
        searchInput: document.getElementById('searchInput'),
        fileTree: document.getElementById('fileTree'),
        fileTitle: document.getElementById('fileTitle'),
        filePath: document.getElementById('filePath'),
        fileViewer: document.getElementById('fileViewer'),
        contentBody: document.getElementById('contentBody'),
        syncBtn: document.getElementById('syncBtn'),
        // General scratchpad
        scratchpadToggle: document.getElementById('scratchpadToggle'),
        scratchpadSection: document.getElementById('scratchpadSection'),
        scratchpadTextarea: document.getElementById('scratchpadTextarea'),
        scratchpadSaveBtn: document.getElementById('scratchpadSaveBtn'),
        scratchpadDeleteBtn: document.getElementById('scratchpadDeleteBtn'),
        scratchpadCloseBtn: document.getElementById('scratchpadCloseBtn'),
        scratchpadStatus: document.getElementById('scratchpadStatus'),

    };

    // Scratchpad state
    let scratchpadChanged = false;
    let scratchpadSaveTimeout = null;
    const SCRATCHPAD_KEY = 'mun_scratchpad';

    // Initialize application
    function init() {
        loadManifestFiles();
        setupEventListeners();
        restoreTheme();
    }

    // Load initial manifest files
    function loadManifestFiles() {
        const manifest = window.MUN_MANIFEST || [];
        files = [];
        fileMap.clear();

        manifest.forEach(item => {
            if (item.name.endsWith('.ps1')) return;

            const normalized = normalizeFile(item.path, item.name, item.content);
            files.push(normalized);
            fileMap.set(normalized.path, normalized);
        });

        files.sort((a, b) => a.path.localeCompare(b.path));
        renderTree();
    }

    // Normalize file object
    function normalizeFile(relPath, filename, content) {
        const path = relPath.replace(/\\\\/g, '/');
        const parts = path.split('/');
        const committee = parts.length > 1 ? parts[0] : 'General Guide';

        return {
            path: path,
            name: filename,
            displayName: filename.replace(/\.txt$/i, '').replace(/\.md$/i, ''),
            committee: committee,
            content: content || ''
        };
    }

    // Custom Folder Icon Resolver
    function getFolderIcon(name) {
        if (name === 'UNHRC') return '🕊️';
        if (name === 'UNSC') return '⚓';
        if (name === 'Countries') return '🌐';
        if (name === 'Speeches') return '🎤';
        if (name === 'Resolutions') return '📜';
        if (name === 'Resources') return '📚';
        if (name === 'Agenda') return '📋';
        return '📁';
    }

    // Custom File Icon Resolver
    function getFileIcon(filename) {
        if (filename.includes('README')) return '📖';
        if (filename.includes('Handbook') || filename.includes('Agenda')) return '📋';
        if (filename.includes('Speech') || filename.includes('GSL')) return '🎤';
        if (filename.includes('Resolution') || filename.includes('Clauses')) return '📜';
        if (filename.includes('Aggregated')) return '📊';
        return '📄';
    }

    // Render tree view
    function renderTree() {
        elements.fileTree.innerHTML = '';

        const filteredFiles = files.filter(f => {
            const matchesCommittee = selectedCommittee === 'all' || f.committee === selectedCommittee || f.committee === 'General Guide';
            const matchesSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery);
            return matchesCommittee && matchesSearch;
        });

        const treeObj = {};
        filteredFiles.forEach(file => {
            const parts = file.path.split('/');
            let current = treeObj;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (i === parts.length - 1) {
                    if (!current._files) current._files = [];
                    current._files.push(file);
                } else {
                    if (!current[part]) current[part] = {};
                    current = current[part];
                }
            }
        });

        function renderNode(container, obj) {
            const folders = Object.keys(obj).filter(k => k !== '_files').sort();

            folders.forEach(folderName => {
                const folderEl = document.createElement('div');
                folderEl.className = 'tree-folder open';

                const headerEl = document.createElement('div');
                headerEl.className = 'folder-header';
                const folderBadge = getFolderIcon(folderName);
                headerEl.innerHTML = `<span class="folder-icon">▸</span><span>${folderBadge} ${folderName}</span>`;

                headerEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    folderEl.classList.toggle('open');
                });

                const childrenEl = document.createElement('div');
                childrenEl.className = 'folder-children';

                renderNode(childrenEl, obj[folderName]);

                folderEl.appendChild(headerEl);
                folderEl.appendChild(childrenEl);
                container.appendChild(folderEl);
            });

            if (obj._files) {
                obj._files.forEach(file => {
                    const fileEl = document.createElement('div');
                    fileEl.className = `tree-file ${currentFile && currentFile.path === file.path ? 'active' : ''}`;
                    const fileBadge = getFileIcon(file.name);
                    fileEl.innerHTML = `<span>${fileBadge}</span><span>${file.displayName}</span>`;

                    fileEl.addEventListener('click', () => openFile(file.path));
                    container.appendChild(fileEl);
                });
            }
        }

        renderNode(elements.fileTree, treeObj);
    }

    // ─── Open File & Display Content ──────────────────────────────

    function openFile(path) {
        const file = fileMap.get(path);
        if (!file) return;

        currentFile = file;
        elements.fileTitle.textContent = file.displayName;
        elements.filePath.textContent = file.path;

        // Show file content
        renderFileContent();

        // Highlight active item in tree
        document.querySelectorAll('.tree-file').forEach(el => {
            el.classList.toggle('active', el.textContent.includes(file.displayName));
        });

        // Scroll viewer to top
        elements.contentBody.scrollTop = 0;
    }

    // Render file content in the viewer
    function renderFileContent() {
        if (!currentFile) return;

        elements.fileViewer.textContent = currentFile.content;

        // Trigger fade-in
        elements.fileViewer.style.animation = 'none';
        void elements.fileViewer.offsetWidth;
        elements.fileViewer.style.animation = 'fadeIn 0.2s ease-out';
    }

    // ─── General Scratchpad ───────────────────────────────────────

    function toggleScratchpad() {
        const isHidden = elements.scratchpadSection.style.display === 'none' || !elements.scratchpadSection.style.display;

        if (isHidden) {
            // Load saved scratchpad content
            const saved = localStorage.getItem(SCRATCHPAD_KEY);
            elements.scratchpadTextarea.value = saved || '';
            scratchpadChanged = false;

            if (saved && saved.trim() !== '') {
                updateScratchpadStatus('saved', 'Saved');
                elements.scratchpadToggle.classList.add('has-notes');
            } else {
                updateScratchpadStatus('', '');
            }

            elements.scratchpadSection.style.display = 'block';
            elements.scratchpadToggle.classList.add('active');
            elements.scratchpadToggle.title = 'Close Scratchpad';

            // Scroll to it
            setTimeout(() => {
                elements.scratchpadTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                elements.scratchpadTextarea.focus();
            }, 80);

            setTimeout(() => {
                elements.scratchpadToggle.classList.remove('active');
            }, 1500);
        } else {
            elements.scratchpadSection.style.display = 'none';
            elements.scratchpadToggle.title = 'Open Scratchpad';
        }
    }

    function saveScratchpad(silent) {
        const text = elements.scratchpadTextarea.value;

        if (text.trim()) {
            localStorage.setItem(SCRATCHPAD_KEY, text);
            elements.scratchpadToggle.classList.add('has-notes');
        } else {
            localStorage.removeItem(SCRATCHPAD_KEY);
            elements.scratchpadToggle.classList.remove('has-notes');
        }

        scratchpadChanged = false;
        updateScratchpadStatus('saved', 'Saved');

        if (scratchpadSaveTimeout) {
            clearTimeout(scratchpadSaveTimeout);
            scratchpadSaveTimeout = null;
        }

        if (!silent) {
            elements.scratchpadSaveBtn.innerHTML = '✅ Saved!';
            setTimeout(() => {
                elements.scratchpadSaveBtn.innerHTML = '💾 Save';
            }, 1500);
        }
    }

    function deleteScratchpad() {
        if (!confirm('Clear all scratchpad content?')) return;

        localStorage.removeItem(SCRATCHPAD_KEY);
        elements.scratchpadTextarea.value = '';
        scratchpadChanged = false;
        updateScratchpadStatus('', '');
        elements.scratchpadToggle.classList.remove('has-notes');

        if (scratchpadSaveTimeout) {
            clearTimeout(scratchpadSaveTimeout);
            scratchpadSaveTimeout = null;
        }

        elements.scratchpadDeleteBtn.innerHTML = '🗑️ Cleared!';
        setTimeout(() => {
            elements.scratchpadDeleteBtn.innerHTML = '🗑️ Clear';
        }, 1500);
    }

    function updateScratchpadStatus(type, text) {
        elements.scratchpadStatus.className = 'scratchpad-status' + (type ? ' ' + type : '');
        elements.scratchpadStatus.textContent = text;
    }

    // ─── Sync: re-fetch manifest.js with cache busting ──────────

    async function reloadManifest() {
        try {
            const response = await fetch(`manifest.js?t=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to fetch manifest.js');
            const jsText = await response.text();

            // Greedy match from first '[' to last '];' to avoid breaking on '];' in file content
            const match = jsText.match(/window\.MUN_MANIFEST\s*=\s*(\[[\s\S]*\]);/);
            if (!match) throw new Error('Could not parse manifest.js');

            // Preserve current file path to re-select it later
            const previousFilePath = currentFile ? currentFile.path : null;

            // Reuse existing loading logic
            window.MUN_MANIFEST = JSON.parse(match[1]);
            loadManifestFiles();

            // Re-select the previously open file if it still exists
            if (previousFilePath && fileMap.has(previousFilePath)) {
                openFile(previousFilePath);
            } else {
                currentFile = null;
                elements.fileTitle.textContent = 'No file selected';
                elements.filePath.textContent = 'MUN/';
                elements.fileViewer.textContent = 'Select a file from the left sidebar to view its content.';
            }

            // Flash feedback
            elements.syncBtn.textContent = '✅ Synced!';
            setTimeout(() => {
                elements.syncBtn.textContent = '📁 Sync';
            }, 1500);
        } catch (err) {
            console.error('Sync failed:', err);
            elements.syncBtn.textContent = '❌ Failed!';
            setTimeout(() => {
                elements.syncBtn.textContent = '📁 Sync';
            }, 2000);
        }
    }

    // ─── Event Listeners ──────────────────────────────────────────

    function setupEventListeners() {
        // Theme toggle
        elements.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', nextTheme);
            localStorage.setItem('mun_theme', nextTheme);
            elements.themeToggle.textContent = nextTheme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode';
        });

        // Committee selector
        elements.committeeSelect.addEventListener('change', (e) => {
            selectedCommittee = e.target.value;
            renderTree();
        });

        // Filename search
        elements.searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderTree();
        });

        // ── Scratchpad events ──
        elements.scratchpadToggle.addEventListener('click', toggleScratchpad);
        elements.scratchpadSaveBtn.addEventListener('click', () => saveScratchpad(false));
        elements.scratchpadDeleteBtn.addEventListener('click', deleteScratchpad);
        elements.scratchpadCloseBtn.addEventListener('click', () => {
            elements.scratchpadSection.style.display = 'none';
            elements.scratchpadToggle.title = 'Open Scratchpad';
        });

        elements.scratchpadTextarea.addEventListener('input', () => {
            scratchpadChanged = true;
            updateScratchpadStatus('unsaved', 'Unsaved changes');

            if (scratchpadSaveTimeout) clearTimeout(scratchpadSaveTimeout);

            scratchpadSaveTimeout = setTimeout(() => {
                saveScratchpad(true);
            }, 2000);
        });

        // ── Sync: re-fetch manifest.js with cache busting ──
        elements.syncBtn.addEventListener('click', reloadManifest);
    }

    // Restore user theme
    function restoreTheme() {
        const savedTheme = localStorage.getItem('mun_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        elements.themeToggle.textContent = savedTheme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode';
    }

    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (scratchpadChanged) {
            e.preventDefault();
            e.returnValue = 'You have unsaved notes. Are you sure you want to leave?';
        }
    });

    // ─── Password Auth ────────────────────────────────────────────

    const PASSWORD = '$Waheguru1';

    function checkAuth() {
        if (sessionStorage.getItem('mun_auth') === 'true') {
            hideLogin();
            init();
            return;
        }
        showLogin();
    }

    function showLogin() {
        const overlay = document.getElementById('loginOverlay');
        const card = document.getElementById('loginCard');
        const input = document.getElementById('passwordInput');
        const toggleBtn = document.getElementById('togglePassword');
        const unlockBtn = document.getElementById('unlockBtn');
        const errorEl = document.getElementById('loginError');

        overlay.classList.remove('hidden');
        input.focus();

        function submitPassword() {
            const value = input.value;
            if (value === PASSWORD) {
                sessionStorage.setItem('mun_auth', 'true');
                hideLogin();
                init();
            } else {
                errorEl.textContent = 'Incorrect password. Please try again.';
                card.classList.remove('shake');
                void card.offsetWidth;
                card.classList.add('shake');
                input.value = '';
                input.focus();
            }
        }

        function toggleVisibility() {
            if (input.type === 'password') {
                input.type = 'text';
                toggleBtn.textContent = '🙈';
                toggleBtn.title = 'Hide Password';
            } else {
                input.type = 'password';
                toggleBtn.textContent = '👁️';
                toggleBtn.title = 'Show Password';
            }
        }

        unlockBtn.addEventListener('click', submitPassword);
        input.addEventListener('keydown', function handler(e) {
            if (e.key === 'Enter') {
                submitPassword();
            }
        });
        toggleBtn.addEventListener('click', toggleVisibility);
    }

    function hideLogin() {
        const overlay = document.getElementById('loginOverlay');
        overlay.classList.add('hidden');
    }

    // Start application (auth check runs first)
    document.addEventListener('DOMContentLoaded', checkAuth);

})();
