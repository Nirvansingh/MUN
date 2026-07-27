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
    let revisionMode = false;
    let sidebarVisible = true;
    let rightPanelVisible = true;
    let historyStack = [];
    let historyIndex = -1;
    let pinnedFiles = [];
    let recentFiles = [];
    let folderStates = {};

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
        contentHeaderActions: document.getElementById('contentHeaderActions'),
        syncBtn: document.getElementById('syncBtn'),
        sidebar: document.getElementById('sidebar'),
        rightPanel: document.getElementById('rightPanel'),
        rightPanelContent: document.getElementById('rightPanelContent'),
        homeDashboard: document.getElementById('homeDashboard'),
        searchResults: document.getElementById('searchResults'),
        countryCard: document.getElementById('countryCard'),
        relatedContent: document.getElementById('relatedContent'),
        pinBtn: document.getElementById('pinBtn'),
        revisionBtn: document.getElementById('revisionBtn'),
        revisionToggle: document.getElementById('revisionToggle'),
        shortcutHints: document.getElementById('shortcutHints'),
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
    const STATE_KEY = 'mun_hub_state';
    const RECENT_KEY = 'mun_recent_files';
    const PINNED_KEY = 'mun_pinned_files';
    const FOLDER_KEY = 'mun_folder_states';

    // Initialize application
    function init() {
        loadState();
        loadManifestFiles();
        setupEventListeners();
        restoreTheme();
        renderDashboard();
    }

    // ─── State Persistence ────────────────────────────────────────

    function loadState() {
        try {
            recentFiles = JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
            pinnedFiles = JSON.parse(localStorage.getItem(PINNED_KEY)) || [];
            folderStates = JSON.parse(localStorage.getItem(FOLDER_KEY)) || {};
            const saved = JSON.parse(localStorage.getItem(STATE_KEY));
            if (saved) {
                sidebarVisible = saved.sidebarVisible !== false;
                rightPanelVisible = saved.rightPanelVisible !== false;
            }
        } catch (e) { /* ignore */ }
    }

    function saveRecentFiles() {
        localStorage.setItem(RECENT_KEY, JSON.stringify(recentFiles.slice(0, 20)));
    }

    function savePinnedFiles() {
        localStorage.setItem(PINNED_KEY, JSON.stringify(pinnedFiles));
    }

    function saveFolderStates() {
        localStorage.setItem(FOLDER_KEY, JSON.stringify(folderStates));
    }

    function saveAppState() {
        localStorage.setItem(STATE_KEY, JSON.stringify({
            sidebarVisible,
            rightPanelVisible
        }));
    }

    function addToRecent(path) {
        recentFiles = recentFiles.filter(p => p !== path);
        recentFiles.unshift(path);
        saveRecentFiles();
    }

    function isPinned(path) {
        return pinnedFiles.includes(path);
    }

    function togglePin(path) {
        if (isPinned(path)) {
            pinnedFiles = pinnedFiles.filter(p => p !== path);
        } else {
            pinnedFiles.unshift(path);
        }
        savePinnedFiles();
        updatePinButton();
        if (!currentFile) renderDashboard();
    }

    function updatePinButton() {
        if (!elements.pinBtn || !currentFile) return;
        elements.pinBtn.textContent = isPinned(currentFile.path) ? '📌 Pinned' : '📌';
        elements.pinBtn.title = isPinned(currentFile.path) ? 'Unpin document' : 'Pin document';
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
        const isCountry = parts.length >= 3 && parts[1] === 'Countries';
        const category = isCountry ? 'Country' :
            parts[1] === 'Speeches' ? 'Speech' :
            parts[1] === 'Resolutions' ? 'Resolution' :
            parts[1] === 'Resources' ? 'Resource' :
            parts.length >= 2 ? parts[1] : 'Guide';

        return {
            path: path,
            name: filename,
            displayName: filename.replace(/\.txt$/i, '').replace(/\.md$/i, ''),
            committee: committee,
            category: category,
            content: content || '',
            isCountry: isCountry,
            parts: parts
        };
    }

    // ─── Folder Icon & Color Resolver ─────────────────────────────

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

    function getFolderColorClass(name) {
        if (name === 'Countries') return 'color-countries';
        if (name === 'Resources') return 'color-resources';
        if (name === 'Speeches') return 'color-speeches';
        if (name === 'Resolutions') return 'color-resolutions';
        if (name === '00 Agenda Handbook') return 'color-agenda';
        if (name.includes('Agenda')) return 'color-agenda';
        return '';
    }

    // Country emoji flags - simple mapping
    function getCountryFlag(filename) {
        const name = filename.replace(/\.txt$/i, '').toLowerCase();
        const flags = {
            'afghanistan': '🇦🇫', 'china': '🇨🇳', 'france': '🇫🇷', 'india': '🇮🇳',
            'iran': '🇮🇷', 'israel': '🇮🇱', 'myanmar': '🇲🇲', 'north korea': '🇰🇵',
            'pakistan': '🇵🇰', 'palestine': '🇵🇸', 'russia': '🇷🇺', 'saudi arabia': '🇸🇦',
            'syria': '🇸🇾', 'united kingdom': '🇬🇧', 'usa': '🇺🇸',
            'egypt': '🇪🇬', 'germany': '🇩🇪', 'italy': '🇮🇹', 'japan': '🇯🇵',
            'south korea': '🇰🇷', 'türkiye': '🇹🇷', 'turkey': '🇹🇷', 'uae': '🇦🇪',
            'ukraine': '🇺🇦', 'qatar': '🇶🇦'
        };
        return flags[name] || '';
    }

    // Custom File Icon Resolver
    function getFileIcon(filename, file) {
        if (file && file.isCountry) {
            const flag = getCountryFlag(filename);
            if (flag) return flag;
        }
        if (filename.includes('README')) return '📖';
        if (filename.includes('Handbook') || filename.includes('Agenda')) return '📋';
        if (filename.includes('Speech') || filename.includes('GSL')) return '🎤';
        if (filename.includes('Resolution') || filename.includes('Clauses')) return '📜';
        if (filename.includes('Aggregated')) return '📊';
        return '📄';
    }

    // Parse country info from content (simple extraction)
    function parseCountryInfo(content) {
        const info = {};
        const lines = content.split('\n');
        for (let i = 0; i < Math.min(lines.length, 80); i++) {
            const l = lines[i].trim();
            if (l.startsWith('Official Name:')) info.officialName = l.replace('Official Name:', '').trim();
            if (l.startsWith('Capital:')) info.capital = l.replace('Capital:', '').trim();
            if (l.startsWith('Government:')) info.government = l.replace('Government:', '').trim();
            if (l.startsWith('Current Leader:') || l.startsWith('Head of State:') || l.startsWith('Head of Government:')) info.leader = l.replace(/^(Current Leader:|Head of State:|Head of Government:)/, '').trim();
            if (l.startsWith('Importance to Committee:')) info.importance = l.replace('Importance to Committee:', '').trim();
            if (l.startsWith('UNSC Status:') || l.startsWith('P5 Member:')) info.unscStatus = l.replace(/^(UNSC Status:|P5 Member:)/, '').trim();
            if (l.startsWith('Likely Allies:')) info.allies = l.replace('Likely Allies:', '').trim();
            if (l.startsWith('Likely Opponents:')) info.opponents = l.replace('Likely Opponents:', '').trim();
            if (l.startsWith('Likely Allies')) { const m = l.match(/:\s*(.+)/); if (m) info.allies = m[1].trim(); }
            if (l.startsWith('Likely Opponents')) { const m = l.match(/:\s*(.+)/); if (m) info.opponents = m[1].trim(); }
        }
        return info;
    }

    // Extract outline from content
    function extractOutline(content) {
        const lines = content.split('\n');
        const outline = [];
        for (const line of lines) {
            const t = line.trim();
            if (t.startsWith('===') && t.length > 10) {
                const title = t.replace(/=/g, '').trim();
                if (title) outline.push({ level: 0, text: title });
            } else if (t.startsWith('---') && t.length > 10) {
                const title = t.replace(/-/g, '').trim();
                if (title) outline.push({ level: 1, text: title });
            }
        }
        return outline.slice(0, 30);
    }

    // Estimate reading time
    function readingTime(text) {
        const words = text.split(/\s+/).length;
        const min = Math.max(1, Math.round(words / 200));
        return `${min} min read`;
    }

    // ─── Render Tree ──────────────────────────────────────────────

    function renderTree() {
        elements.fileTree.innerHTML = '';

        const filteredFiles = files.filter(f => {
            const matchesCommittee = selectedCommittee === 'all' || f.committee === selectedCommittee || f.committee === 'General Guide';
            return matchesCommittee;
        });

        // If searching, also filter tree (but search results shown in main area)
        const treeFiles = searchQuery
            ? filteredFiles.filter(f => f.name.toLowerCase().includes(searchQuery))
            : filteredFiles;

        const treeObj = {};
        treeFiles.forEach(file => {
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

        function renderNode(container, obj, parentPath) {
            const folders = Object.keys(obj).filter(k => k !== '_files').sort();

            folders.forEach(folderName => {
                const fullPath = parentPath ? parentPath + '/' + folderName : folderName;
                const folderEl = document.createElement('div');
                folderEl.className = 'tree-folder';
                if (folderStates[fullPath] !== false) folderEl.classList.add('open');

                const headerEl = document.createElement('div');
                headerEl.className = 'folder-header';
                const folderBadge = getFolderIcon(folderName);
                const colorClass = getFolderColorClass(folderName);
                const colorDot = colorClass ? `<span class="folder-color-dot ${colorClass}"></span>` : '';
                headerEl.innerHTML = `<span class="folder-icon">▸</span>${colorDot}<span>${folderBadge} ${folderName}</span>`;

                headerEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    folderEl.classList.toggle('open');
                    folderStates[fullPath] = folderEl.classList.contains('open');
                    saveFolderStates();
                });

                const childrenEl = document.createElement('div');
                childrenEl.className = 'folder-children';
                renderNode(childrenEl, obj[folderName], fullPath);

                folderEl.appendChild(headerEl);
                folderEl.appendChild(childrenEl);
                container.appendChild(folderEl);
            });

            if (obj._files) {
                obj._files.forEach(file => {
                    const fileEl = document.createElement('div');
                    fileEl.className = `tree-file ${currentFile && currentFile.path === file.path ? 'active' : ''}`;
                    const fileBadge = getFileIcon(file.name, file);
                    const displayText = file.isCountry ? file.displayName.replace(/^.*?\s/, '') : file.displayName;
                    fileEl.innerHTML = `<span>${fileBadge}</span><span>${displayText}</span>`;

                    fileEl.addEventListener('click', () => openFile(file.path));
                    container.appendChild(fileEl);
                });
            }
        }

        renderNode(elements.fileTree, treeObj, '');
    }

    // ─── Open File & Display Content ──────────────────────────────

    function openFile(path) {
        const file = fileMap.get(path);
        if (!file) return;

        // Save scroll position for current file
        if (currentFile) {
            try {
                const key = 'scroll_' + currentFile.path.replace(/\//g, '_');
                localStorage.setItem(key, String(elements.contentBody.scrollTop));
            } catch (e) { /* ignore */ }
        }

        currentFile = file;
        historyStack = historyStack.slice(0, historyIndex + 1);
        historyStack.push(path);
        historyIndex = historyStack.length - 1;
        addToRecent(path);

        // Update header
        elements.fileTitle.textContent = file.displayName;
        elements.filePath.textContent = file.path;
        elements.filePath.style.display = '';
        elements.contentHeaderActions.style.display = '';
        revisionMode = false;

        // Hide dashboard, search results; show file viewer
        elements.homeDashboard.style.display = 'none';
        elements.searchResults.style.display = 'none';
        elements.fileViewer.style.display = '';
        elements.countryCard.style.display = 'none';
        elements.relatedContent.style.display = 'none';

        // Render file content
        renderFileContent();

        // Render country card if applicable
        if (file.isCountry) {
            renderCountryCard(file);
        }

        // Render related content
        renderRelatedContent(file);

        // Update right panel
        updateRightPanel(file);

        // Update pin button
        updatePinButton();

        // Highlight active item in tree
        document.querySelectorAll('.tree-file').forEach(el => {
            el.classList.toggle('active', el.textContent.trim().includes(file.displayName) ||
                el.textContent.includes(file.name.replace(/\.txt$/i, '')));
        });

        // Restore scroll position
        try {
            const key = 'scroll_' + file.path.replace(/\//g, '_');
            const saved = localStorage.getItem(key);
            if (saved) {
                setTimeout(() => { elements.contentBody.scrollTop = parseInt(saved, 10); }, 50);
            } else {
                elements.contentBody.scrollTop = 0;
            }
        } catch (e) { elements.contentBody.scrollTop = 0; }
    }

    // Render file content in the viewer
    function renderFileContent() {
        if (!currentFile) return;

        let content = currentFile.content;

        // Remove the BATTLE CARD banner lines from display for cleaner reading
        // Keep the content but enhance formatting
        elements.fileViewer.textContent = content;

        // Trigger fade-in
        elements.fileViewer.style.animation = 'none';
        void elements.fileViewer.offsetWidth;
        elements.fileViewer.style.animation = 'fadeIn 0.2s ease-out';
    }

    // ─── Country Summary Card ─────────────────────────────────────

    function renderCountryCard(file) {
        const info = parseCountryInfo(file.content);
        const card = elements.countryCard;
        card.style.display = '';
        card.innerHTML = '';

        const flag = getCountryFlag(file.name) || '🌍';
        const name = file.displayName.replace(/^[^|]*\|/, '').trim() || file.displayName;

        let html = `<div class="country-card-header">
            <span class="country-card-flag">${flag}</span>
            <span class="country-card-name">${name}</span>
        </div>
        <div class="country-card-grid">`;

        const fields = [
            { label: 'Capital', value: info.capital },
            { label: 'Government', value: info.government },
            { label: 'UNSC Status', value: info.unscStatus },
            { label: 'Committee Importance', value: info.importance },
        ];
        fields.forEach(f => {
            if (f.value) html += `<div class="country-card-item"><span class="country-card-label">${f.label}</span><span class="country-card-value">${f.value}</span></div>`;
        });

        html += `</div>`;

        // Allies & Opponents badges
        const badges = [];
        if (info.allies) {
            info.allies.split(',').slice(0, 5).forEach(a => {
                badges.push({ text: a.trim(), type: 'ally' });
            });
        }
        if (info.opponents) {
            info.opponents.split(',').slice(0, 5).forEach(o => {
                badges.push({ text: o.trim(), type: 'opponent' });
            });
        }
        if (badges.length) {
            html += `<div class="country-card-badges">`;
            badges.forEach(b => {
                html += `<span class="country-card-badge ${b.type}">${b.type === 'ally' ? '🤝 ' : '⚔️ '}${b.text}</span>`;
            });
            html += `</div>`;
        }

        card.innerHTML = html;
    }

    // ─── Related Content ──────────────────────────────────────────

    function renderRelatedContent(file) {
        const rc = elements.relatedContent;
        rc.style.display = '';
        rc.innerHTML = '';

        // Find related files by matching keywords and committee
        const committee = file.committee;
        const category = file.category;
        const nameLower = file.displayName.toLowerCase();

        // Extract country name
        const countryMatch = nameLower.match(/^[a-z\s-]+/);
        const countryName = countryMatch ? countryMatch[0].trim() : '';

        const related = [];

        files.forEach(f => {
            if (f.path === file.path) return;
            if (f.committee !== committee) return;

            // Same country in different category
            const fNameLower = f.displayName.toLowerCase();
            if (countryName && fNameLower.includes(countryName) && f.category !== category) {
                related.push({ file: f, reason: 'related' });
                return;
            }

            // Same category
            if (f.category === category && f.parts[1] === file.parts[1]) {
                related.push({ file: f, reason: 'same' });
            }
        });

        // Take up to 8
        const shown = related.slice(0, 8);
        if (!shown.length) { rc.style.display = 'none'; return; }

        let html = `<div class="related-title">📎 Related Files</div><div class="related-grid">`;
        shown.forEach(r => {
            const icon = getFileIcon(r.file.name, r.file);
            html += `<span class="related-chip" data-path="${r.file.path}">${icon} ${r.file.displayName}</span>`;
        });
        html += `</div>`;
        rc.innerHTML = html;

        // Click handlers
        rc.querySelectorAll('.related-chip').forEach(el => {
            el.addEventListener('click', () => {
                const path = el.dataset.path;
                if (path) openFile(path);
            });
        });
    }

    // ─── Right Panel ──────────────────────────────────────────────

    function updateRightPanel(file) {
        const panel = elements.rightPanelContent;
        if (!file) {
            panel.innerHTML = `<div class="right-panel-placeholder">
                <span class="right-panel-icon">📋</span>
                <span>Select a file to see details</span>
            </div>`;
            return;
        }

        let html = '';

        // Quick Facts
        html += `<div class="right-panel-section">
            <div class="right-panel-section-title">📊 Quick Facts</div>
            <div class="right-panel-item"><span class="rpi-icon">📁</span><span class="rpi-text">${file.committee}</span></div>
            <div class="right-panel-item"><span class="rpi-icon">📂</span><span class="rpi-text">${file.category}</span></div>
            <div class="right-panel-item"><span class="rpi-icon">⏱️</span><span class="rpi-text">${readingTime(file.content)}</span></div>
            <div class="right-panel-item" style="cursor:pointer;" onclick="document.getElementById('pinBtn').click()">
                <span class="rpi-icon">📌</span><span class="rpi-text">${isPinned(file.path) ? 'Pinned' : 'Click to pin'}</span>
            </div>
        </div>`;

        // Outline
        const outline = extractOutline(file.content);
        if (outline.length) {
            html += `<div class="right-panel-section">
                <div class="right-panel-section-title">📑 Outline</div>`;
            outline.forEach((item, idx) => {
                html += `<div class="right-panel-outline-item level-${item.level}" data-section="${idx}">${item.text}</div>`;
            });
            html += `</div>`;
        }

        // Recently viewed
        if (recentFiles.length > 1) {
            html += `<div class="right-panel-section">
                <div class="right-panel-section-title">🕐 Recent</div>`;
            recentFiles.slice(0, 5).forEach(p => {
                const f = fileMap.get(p);
                if (f && f.path !== file.path) {
                    const icon = getFileIcon(f.name, f);
                    html += `<div class="right-panel-item" data-path="${f.path}"><span class="rpi-icon">${icon}</span><span class="rpi-text">${f.displayName}</span></div>`;
                }
            });
            html += `</div>`;
        }

        panel.innerHTML = html;

        // Add click handlers for recent files and outline
        panel.querySelectorAll('.right-panel-item[data-path]').forEach(el => {
            el.addEventListener('click', () => {
                const p = el.dataset.path;
                if (p) openFile(p);
            });
        });
        panel.querySelectorAll('.right-panel-outline-item').forEach(el => {
            el.addEventListener('click', () => {
                // Scroll to section - simple approach: scroll to top
                elements.contentBody.scrollTop = 0;
            });
        });
    }

    // ─── Home Dashboard ───────────────────────────────────────────

    function renderDashboard() {
        const dashboard = elements.homeDashboard;
        dashboard.style.display = '';
        elements.fileViewer.style.display = 'none';
        elements.searchResults.style.display = 'none';
        elements.countryCard.style.display = 'none';
        elements.relatedContent.style.display = 'none';
        elements.filePath.style.display = 'none';
        elements.contentHeaderActions.style.display = 'none';

        // Determine greeting based on time
        const h = new Date().getHours();
        const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

        const countryFiles = files.filter(f => f.isCountry);
        const unhrcCount = countryFiles.filter(f => f.committee === 'UNHRC').length;
        const unscCount = countryFiles.filter(f => f.committee === 'UNSC').length;
        const totalFiles = files.length;

        let html = `
        <div class="dashboard-welcome">
            <h2>${greeting}, Delegate.</h2>
            <p>${totalFiles} research files ready · ${unhrcCount} UNHRC · ${unscCount} UNSC</p>
        </div>

        <div class="dashboard-committees">
            <div class="dashboard-committee-card" data-committee="UNHRC">
                <span class="dc-icon">🕊️</span>
                <div class="dc-name">UNHRC</div>
                <div class="dc-count">${unhrcCount} countries · AI & Privacy</div>
            </div>
            <div class="dashboard-committee-card" data-committee="UNSC">
                <span class="dc-icon">⚓</span>
                <div class="dc-name">UNSC</div>
                <div class="dc-count">${unscCount} countries · Supply Chains & Maritime</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div class="dashboard-card">
                <div class="dashboard-card-title">📌 Pinned Documents</div>
                <div id="dashPinned">${renderPinnedList()}</div>
            </div>
            <div class="dashboard-card">
                <div class="dashboard-card-title">🕐 Recently Viewed</div>
                <div id="dashRecent">${renderRecentList()}</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div class="dashboard-card">
                <div class="dashboard-card-title">🎤 Quick Speech Access</div>
                ${renderCategoryLinks('Speeches')}
            </div>
            <div class="dashboard-card">
                <div class="dashboard-card-title">📜 Resolution Drafting</div>
                ${renderCategoryLinks('Resolutions')}
            </div>
        </div>`;

        dashboard.innerHTML = html;

        // Committee card click handlers
        dashboard.querySelectorAll('.dashboard-committee-card').forEach(el => {
            el.addEventListener('click', () => {
                const committee = el.dataset.committee;
                if (committee) {
                    elements.committeeSelect.value = committee;
                    selectedCommittee = committee;
                    renderTree();
                }
            });
        });

        // Pinned/recent click handlers
        dashboard.querySelectorAll('.dashboard-card-item').forEach(el => {
            el.addEventListener('click', () => {
                const p = el.dataset.path;
                if (p) openFile(p);
            });
        });

        // Update right panel for dashboard
        updateRightPanel(null);
    }

    function renderPinnedList() {
        if (!pinnedFiles.length) return '<div class="dashboard-empty">Pin files for quick access</div>';
        let h = '';
        pinnedFiles.slice(0, 8).forEach(p => {
            const f = fileMap.get(p);
            if (f) {
                const icon = getFileIcon(f.name, f);
                h += `<div class="dashboard-card-item" data-path="${f.path}"><span class="item-icon">${icon}</span><span class="item-name">${f.displayName}</span><span class="item-committee">${f.committee}</span></div>`;
            }
        });
        return h;
    }

    function renderRecentList() {
        if (!recentFiles.length) return '<div class="dashboard-empty">Open a file to see it here</div>';
        let h = '';
        recentFiles.slice(0, 8).forEach(p => {
            const f = fileMap.get(p);
            if (f) {
                const icon = getFileIcon(f.name, f);
                h += `<div class="dashboard-card-item" data-path="${f.path}"><span class="item-icon">${icon}</span><span class="item-name">${f.displayName}</span><span class="item-committee">${f.committee}</span></div>`;
            }
        });
        return h;
    }

    function renderCategoryLinks(category) {
        const catFiles = files.filter(f => f.parts[1] === category && f.committee !== 'General Guide');
        if (!catFiles.length) return '<div class="dashboard-empty">No files in this category</div>';
        let h = '';
        catFiles.slice(0, 4).forEach(f => {
            const icon = getFileIcon(f.name, f);
            h += `<div class="dashboard-card-item" data-path="${f.path}"><span class="item-icon">${icon}</span><span class="item-name">${f.displayName}</span><span class="item-committee">${f.committee}</span></div>`;
        });
        return h;
    }

    // ─── Full-Text Search ─────────────────────────────────────────

    function performSearch(query) {
        const q = query.toLowerCase().trim();
        searchQuery = q;

        if (!q) {
            elements.searchResults.style.display = 'none';
            elements.fileViewer.style.display = currentFile ? '' : 'none';
            elements.homeDashboard.style.display = currentFile ? 'none' : '';
            renderTree();
            return;
        }

        // Show search results in main area
        elements.homeDashboard.style.display = 'none';
        elements.fileViewer.style.display = 'none';
        elements.countryCard.style.display = 'none';
        elements.relatedContent.style.display = 'none';
        elements.searchResults.style.display = '';
        elements.contentHeaderActions.style.display = 'none';
        elements.filePath.style.display = 'none';
        elements.fileTitle.textContent = 'Search Results';

        // Also filter sidebar
        renderTree();

        // Full-text search
        const results = [];
        const queryWords = q.split(/\s+/).filter(w => w.length > 1);

        files.forEach(file => {
            if (file.content.length > 500000) return; // skip huge files
            const contentLower = file.content.toLowerCase();
            const nameLower = file.name.toLowerCase();

            let relevance = 0;
            const matches = [];

            // Title match (highest relevance)
            if (nameLower.includes(q)) relevance += 10;

            // Find matching lines
            const lines = file.content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineLower = line.toLowerCase();
                if (queryWords.some(w => lineLower.includes(w))) {
                    matches.push({ lineNum: i, text: line.trim() });
                    relevance += 1;
                    if (lineLower.includes(q)) relevance += 2;
                }
                if (matches.length >= 5) break;
            }

            if (relevance > 0) {
                results.push({ file, relevance, matches, nameLower });
            }
        });

        // Sort by relevance
        results.sort((a, b) => b.relevance - a.relevance);

        // Render results
        const container = elements.searchResults;
        let html = `
        <div class="search-results-header">
            <span class="search-results-title">🔍 ${results.length} result${results.length !== 1 ? 's' : ''} for "${q}"</span>
            <button class="search-results-close" id="searchCloseBtn">✕</button>
        </div>`;

        results.slice(0, 30).forEach(r => {
            html += `<div class="search-result-group">
                <div class="search-result-file" data-path="${r.file.path}">${getFileIcon(r.file.name, r.file)} ${r.file.displayName} <span style="color:var(--text-muted);font-weight:400;font-size:11px;">${r.file.committee}</span></div>`;
            r.matches.forEach(m => {
                const highlighted = highlightMatch(m.text, queryWords);
                html += `<div class="search-result-line" data-path="${r.file.path}">${highlighted}</div>`;
            });
            html += `</div>`;
        });

        container.innerHTML = html;

        // Click handlers
        container.querySelectorAll('.search-result-file, .search-result-line').forEach(el => {
            el.addEventListener('click', () => {
                const p = el.dataset.path;
                if (p) {
                    openFile(p);
                    elements.searchInput.value = '';
                    searchQuery = '';
                    elements.searchResults.style.display = 'none';
                    renderTree();
                }
            });
        });

        document.getElementById('searchCloseBtn').addEventListener('click', clearSearch);
    }

    function highlightMatch(text, words) {
        let result = escapeHtml(text);
        words.forEach(w => {
            const re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            result = result.replace(re, '<span class="match">$1</span>');
        });
        return result;
    }

    function escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function clearSearch() {
        elements.searchInput.value = '';
        searchQuery = '';
        elements.searchResults.style.display = 'none';
        if (currentFile) {
            openFile(currentFile.path);
        } else {
            renderDashboard();
        }
        renderTree();
        elements.searchInput.blur();
    }

    // ─── Quick Revision Mode ──────────────────────────────────────

    function toggleRevision() {
        if (!currentFile) return;
        revisionMode = !revisionMode;

        if (revisionMode) {
            renderRevisionView(currentFile);
            elements.revisionBtn.textContent = '📄 Full View';
            elements.revisionToggle.textContent = '📄 Full View';
        } else {
            renderFileContent();
            if (currentFile.isCountry) renderCountryCard(currentFile);
            renderRelatedContent(currentFile);
            elements.revisionBtn.textContent = '📋 Revise';
            elements.revisionToggle.textContent = '📋 Revise';
        }
    }

    function renderRevisionView(file) {
        const content = file.content;
        const lines = content.split('\n');
        const viewer = elements.fileViewer;

        // Extract key sections
        const sections = {
            'Position': [],
            'Strengths': [],
            'Weaknesses': [],
            'Statistics': [],
            'GSL': [],
            'Talking Points': [],
            'Defence Points': [],
            'Defence': [],
            'Solutions': [],
            'Questions': [],
            'Hot Topics': [],
            'Current Affairs': [],
            'Resolutions': [],
            'Resoltuion Ideas': [],
        };

        let currentSection = '';
        for (const line of lines) {
            const t = line.trim();
            const lower = t.toLowerCase();
            if (t.startsWith('GSL TALKING POINTS') || t.startsWith('GENERAL SPEAKER')) { currentSection = 'GSL'; continue; }
            if (t.startsWith('MODERATED CAUCUS')) { currentSection = 'Talking Points'; continue; }
            if (t.startsWith('RESOLUTION IDEAS') || t.startsWith('Resoltuion Ideas')) { currentSection = 'Resolutions'; continue; }
            if (t.startsWith('CURRENT AFFAIRS')) { currentSection = 'Current Affairs'; continue; }
            if (t.startsWith('STRENGTHS')) { currentSection = 'Strengths'; continue; }
            if (t.startsWith('WEAKNESSES')) { currentSection = 'Weaknesses'; continue; }
            if (t.startsWith('KEY DEFENCE POINTS') || t.startsWith('DEFENCE POINTS')) { currentSection = 'Defence'; continue; }
            if (t.startsWith('SOLUTIONS')) { currentSection = 'Solutions'; continue; }
            if (t.startsWith('HOT TOPICS')) { currentSection = 'Hot Topics'; continue; }
            if (t.startsWith('STATISTICS')) { currentSection = 'Statistics'; continue; }

            if (currentSection && sections[currentSection]) {
                if (t && !t.startsWith('---') && !t.startsWith('===') && !t.startsWith('OFFICIAL SOURCES')) {
                    sections[currentSection].push(t);
                }
            }
        }

        let html = '<div class="revision-view">';
        html += `<div class="rv-section"><div class="rv-label">📋 Quick Revision</div><div class="rv-content" style="font-size:12px;color:var(--text-muted);">${file.displayName} · ${file.committee}</div></div>`;

        const order = ['Hot Topics', 'Position', 'Strengths', 'Weaknesses', 'Current Affairs', 'GSL', 'Talking Points', 'Resolutions', 'Defence', 'Solutions', 'Statistics'];
        order.forEach(key => {
            if (sections[key] && sections[key].length) {
                html += `<div class="rv-section"><div class="rv-label">${key}</div><div class="rv-content">`;
                sections[key].slice(0, 8).forEach(line => {
                    if (line.startsWith('•') || line.startsWith('✓') || line.startsWith('✗')) {
                        html += `<span class="rv-tag">${line}</span> `;
                    } else if (line.startsWith('CURRENT AFFAIR')) {
                        html += `<strong style="color:var(--text-heading)">${line}</strong><br>`;
                    } else {
                        html += line + '<br>';
                    }
                });
                html += `</div></div>`;
            }
        });

        html += '</div>';
        viewer.innerHTML = html;
        viewer.style.animation = 'none';
        void viewer.offsetWidth;
        viewer.style.animation = 'fadeIn 0.2s ease-out';
    }

    // ─── General Scratchpad ───────────────────────────────────────

    function toggleScratchpad() {
        const isHidden = elements.scratchpadSection.style.display === 'none' || !elements.scratchpadSection.style.display;

        if (isHidden) {
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

    // ─── Navigation History ───────────────────────────────────────

    function navigateBack() {
        if (historyIndex > 0) {
            historyIndex--;
            const path = historyStack[historyIndex];
            const file = fileMap.get(path);
            if (file) {
                currentFile = file;
                openFile(path);
            }
        }
    }

    function navigateForward() {
        if (historyIndex < historyStack.length - 1) {
            historyIndex++;
            const path = historyStack[historyIndex];
            const file = fileMap.get(path);
            if (file) {
                currentFile = file;
                openFile(path);
            }
        }
    }

    // ─── Sync: re-fetch manifest.js with cache busting ──────────

    async function reloadManifest() {
        try {
            const response = await fetch(`manifest.js?t=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to fetch manifest.js');
            const jsText = await response.text();

            const match = jsText.match(/window\.MUN_MANIFEST\s*=\s*(\[[\s\S]*\]);/);
            if (!match) throw new Error('Could not parse manifest.js');

            const previousFilePath = currentFile ? currentFile.path : null;

            window.MUN_MANIFEST = JSON.parse(match[1]);
            loadManifestFiles();

            if (previousFilePath && fileMap.has(previousFilePath)) {
                openFile(previousFilePath);
            } else {
                currentFile = null;
                renderDashboard();
            }

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
            if (!currentFile) renderDashboard();
        });

        // Full-text search
        elements.searchInput.addEventListener('input', (e) => {
            performSearch(e.target.value);
        });

        // Pin button
        elements.pinBtn.addEventListener('click', () => {
            if (currentFile) togglePin(currentFile.path);
        });

        // Revision buttons
        elements.revisionBtn.addEventListener('click', toggleRevision);
        elements.revisionToggle.addEventListener('click', () => {
            if (currentFile) {
                toggleRevision();
            } else {
                // Open first country file in current committee
                const candidates = files.filter(f => f.isCountry && (selectedCommittee === 'all' || f.committee === selectedCommittee));
                if (candidates.length) openFile(candidates[0].path);
            }
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
            scratchpadSaveTimeout = setTimeout(() => saveScratchpad(true), 2000);
        });

        // ── Sync ──
        elements.syncBtn.addEventListener('click', reloadManifest);

        // ── Keyboard Shortcuts ──
        document.addEventListener('keydown', (e) => {
            // Ctrl+K: Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                elements.searchInput.focus();
                elements.searchInput.select();
                return;
            }

            // Ctrl+B: Toggle sidebar
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                sidebarVisible = !sidebarVisible;
                elements.sidebar.style.display = sidebarVisible ? '' : 'none';
                saveAppState();
                return;
            }

            // Ctrl+R: Toggle revision mode
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                if (currentFile) toggleRevision();
                return;
            }

            // Ctrl+.: Toggle right panel
            if ((e.ctrlKey || e.metaKey) && e.key === '.') {
                e.preventDefault();
                rightPanelVisible = !rightPanelVisible;
                elements.rightPanel.style.display = rightPanelVisible ? '' : 'none';
                saveAppState();
                return;
            }

            // Escape: Close search or hints
            if (e.key === 'Escape') {
                if (elements.shortcutHints.style.display !== 'none') {
                    elements.shortcutHints.style.display = 'none';
                    return;
                }
                if (searchQuery) {
                    clearSearch();
                    return;
                }
            }

            // Alt+Left: Back
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                navigateBack();
            }

            // Alt+Right: Forward
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                navigateForward();
            }

            // ?: Show shortcut hints
            if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const active = document.activeElement;
                if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
                e.preventDefault();
                elements.shortcutHints.style.display = elements.shortcutHints.style.display === 'none' ? '' : 'none';
            }
        });

        // Click outside shortcut hints to close
        elements.shortcutHints.addEventListener('click', (e) => {
            if (e.target === elements.shortcutHints) {
                elements.shortcutHints.style.display = 'none';
            }
        });
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
            if (e.key === 'Enter') submitPassword();
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
