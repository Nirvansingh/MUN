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

        // Detect file type: battle card (UNHRC/UNSC country) vs. global reference
        const isGlobalRef = file.path.startsWith('Global Reference');
        const isBattleCard = !isGlobalRef && (
            content.includes('STRENGTHS') ||
            content.includes('GSL TALKING POINTS') ||
            content.includes('BATTLE CARD')
        );

        if (isGlobalRef) {
            renderGlobalRefRevision(file, lines, viewer);
            return;
        }

        // ── Battle card revision (UNHRC/UNSC) ──
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

    // ── Global Reference Revision ──
    function renderGlobalRefRevision(file, lines, viewer) {
        // Map Global Reference section headers to display labels
        const sectionMap = {
            'QUICK SUMMARY': 'Quick Summary',
            'BASIC INFORMATION': 'Basic Info',
            'ECONOMY': 'Economy',
            'MILITARY & SECURITY': 'Military & Security',
            'GEOGRAPHY & INFLUENCE': 'Geography',
            'ENERGY & RESOURCES': 'Energy & Resources',
            'SOCIETY': 'Society',
            'FOREIGN POLICY': 'Foreign Policy',
            'ALLIANCES & RIVALRIES': 'Alliances & Rivals',
            'NATIONAL INTERESTS & CHALLENGES': 'Interests & Challenges',
            'INTERESTING FACTS': 'Facts',
        };

        const sections = {};
        for (const key of Object.keys(sectionMap)) {
            sections[key] = [];
        }

        let currentSection = '';
        for (const line of lines) {
            const t = line.trim();
            if (/^={2,}\s*$/.test(t)) continue;
            const upper = t.toUpperCase();
            if (sectionMap[upper]) {
                currentSection = upper;
                continue;
            }
            if (currentSection && sections[currentSection]) {
                if (t && !t.startsWith('===') && !t.startsWith('---')) {
                    sections[currentSection].push(t);
                }
            }
        }

        let html = '<div class="revision-view">';
        html += `<div class="rv-section"><div class="rv-label">📋 Country Profile</div><div class="rv-content" style="font-size:12px;color:var(--text-muted);">${file.displayName} · Global Reference</div></div>`;

        const order = ['QUICK SUMMARY', 'BASIC INFORMATION', 'ECONOMY', 'MILITARY & SECURITY', 'GEOGRAPHY & INFLUENCE', 'ENERGY & RESOURCES', 'SOCIETY', 'FOREIGN POLICY', 'ALLIANCES & RIVALRIES', 'NATIONAL INTERESTS & CHALLENGES', 'INTERESTING FACTS'];
        order.forEach(key => {
            if (sections[key] && sections[key].length) {
                const label = sectionMap[key];
                const contentLines = sections[key].filter(l => l && !l.startsWith('=') && !l.startsWith('-') && !l.startsWith('SOURCES'));
                if (!contentLines.length) return;

                html += `<div class="rv-section"><div class="rv-label">${label}</div><div class="rv-content">`;

                contentLines.slice(0, 14).forEach(line => {
                    // Bullet points → tags (same as battle card style)
                    if (line.startsWith('•') || line.startsWith('✓') || line.startsWith('✗')) {
                        html += `<span class="rv-tag">${line}</span> `;
                    }
                    // Long comma-separated lists → split into chips
                    else if (line.includes(', ') && line.length > 60) {
                        const items = line.split(', ').slice(0, 8);
                        items.forEach(item => {
                            const cleaned = item.replace(/^•\s*/, '').trim();
                            if (cleaned) html += `<span class="rv-tag">${cleaned}</span> `;
                        });
                    }
                    // Regular text (including key:value pairs) → plain text like battle cards
                    else {
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
    let isAuthenticated = false;

    function checkAuth() {
        if (isAuthenticated) {
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
                isAuthenticated = true;
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

    // ═══════════════════════════════════════════════════════════════
    //  MUN FACT WIDGET
    // ═══════════════════════════════════════════════════════════════

    const munFacts = [
        'The United Nations was founded on October 24, 1945, after World War II to prevent future conflicts.',
        'The UN has 193 member states — nearly every recognized sovereign nation on Earth.',
        'The UN Security Council has 5 permanent members (P5): USA, UK, France, Russia, and China.',
        'A single "no" vote from any P5 member can veto any UNSC resolution.',
        'The UNHRC (Human Rights Council) is an inter-governmental body of 47 member states.',
        'The first MUN conference was held at Harvard University in 1953.',
        'MUN delegates learn diplomacy, public speaking, negotiation, and critical thinking.',
        'In MUN, "Points" include Point of Order, Point of Inquiry, Point of Personal Privilege, and Point of Information.',
        'A "Moderated Caucus" is a timed debate where the Speaker\'s List is set aside for focused discussion.',
        'An "Unmoderated Caucus" (unmod) allows delegates to freely discuss and draft resolutions.',
        'The "Dais" refers to the Chair, Vice-Chair, and Rapporteur who moderate the committee.',
        'A "Working Paper" is an informal draft that becomes a "Draft Resolution" when formally introduced.',
        'A "Placard" is the sign delegates raise to indicate they wish to speak or vote.',
        'The "Speaker\'s List" (GSL) is the queue of delegates waiting to address the committee.',
        '"Preambulatory Clauses" in resolutions describe the problem and cite past UN actions.',
        '"Operative Clauses" in resolutions state the specific actions the committee will take.',
        'The "Right of Reply" allows a delegate to respond to an insulting remark from another delegate.',
        'Diplomatic immunity means diplomats cannot be prosecuted in the host country for minor offenses.',
        'The UN Charter is the foundational treaty of the United Nations, signed in 1945.',
        'The Universal Declaration of Human Rights (UDHR) was adopted by the UN in 1948.',
        'The International Court of Justice (ICJ) is the UN\'s principal judicial organ.',
        'The World Health Organization (WHO) is a UN specialized agency focused on global health.',
        'UNESCO (UN Educational, Scientific and Cultural Organization) protects world heritage sites.',
        'The UN peacekeeping budget is about $6.5 billion annually — less than 0.5% of global military spending.',
        'The first UN peacekeeping mission was established in 1948 to monitor the Arab-Israeli ceasefire.',
        'The UN has six official languages: Arabic, Chinese, English, French, Russian, and Spanish.',
        'The UN Headquarters in New York City has diplomatic status — it is not US territory.',
        'The UN Secretary-General is both the chief administrative officer and the face of the UN.',
        'The UN Sustainable Development Goals (SDGs) are 17 goals adopted in 2015 to achieve by 2030.',
        '"Diplomacy is the art of letting someone else have your way." — often attributed to Daniele Vare.',
        '"The United Nations was not created to bring us to heaven, but to save us from hell." — Dag Hammarskjöld.',
        '"We the peoples of the United Nations..." — the first words of the UN Charter.',
        'In MUN, always know your country\'s position — never speak as yourself, always as your delegate.',
        'A strong MUN speech starts with a hook, states your position, and ends with a call to action.',
        'The best MUN delegates listen more than they speak — alliances are built on understanding.',
        'The UN General Assembly (UNGA) is the main deliberative body where every member has one vote.',
        'The Economic and Social Council (ECOSOC) coordinates the UN\'s economic and social work.',
        'The Trusteeship Council was established to oversee decolonization — it is now largely inactive.',
        'The UN Secretariat carries out the day-to-day work of the UN, led by the Secretary-General.',
        'The International Criminal Court (ICC) prosecutes individuals for genocide, war crimes, and crimes against humanity.',
        'The UN was awarded the Nobel Peace Prize in 2001 for its work toward a better organized world.',
        'The UN Office at Geneva (UNOG) is the European headquarters of the UN.',
        'The UN Environment Programme (UNEP) coordinates the UN\'s environmental activities.',
        'The UN Refugee Agency (UNHCR) protects refugees and helps find solutions for displacement.',
        'The World Food Programme (WFP) provides food assistance to millions of people worldwide.',
        'The UN Convention on the Law of the Sea (UNCLOS) governs maritime rights and boundaries.',
        'The Paris Agreement is a legally binding international treaty on climate change, adopted in 2015.',
        'The North Atlantic Treaty Organization (NATO) was founded in 1949 as a collective defense alliance.',
        'The European Union (EU) began as the European Coal and Steel Community in 1951.',
        'The G7 is an informal group of seven major advanced economies: Canada, France, Germany, Italy, Japan, UK, and USA.',
        'The G20 includes the G7 plus emerging economies like China, India, Brazil, Russia, and South Africa.',
        'The World Trade Organization (WTO) sets global rules of trade between nations.',
        'The International Monetary Fund (IMF) provides loans and financial stability to member countries.',
        'The World Bank provides financial and technical assistance to developing countries.',
        'The Organization of Islamic Cooperation (OIC) is the second largest intergovernmental organization after the UN.',
        'The African Union (AU) is a continental union of 55 member states in Africa.',
        'The Arab League is a regional organization of Arab countries in and around North Africa and the Middle East.',
        'The Shanghai Cooperation Organisation (SCO) is a political, economic, and security alliance of Eurasian states.',
        'The Commonwealth of Nations is a political association of 56 member states, mostly former British colonies.',
        'The Non-Aligned Movement (NAM) is a forum of 120 developing nations not formally aligned with any major power bloc.',
        'The Arctic Council addresses issues faced by Arctic governments and indigenous peoples.',
        'The Antarctic Treaty System regulates international relations regarding Antarctica.',
        'The Geneva Conventions establish international legal standards for humanitarian treatment in war.',
        'The Responsibility to Protect (R2P) is a UN principle that states must protect populations from mass atrocities.',
        'The Vienna Convention on Diplomatic Relations (1961) sets the rules for diplomatic immunity.',
        'The Law of the Sea (UNCLOS) defines territorial waters (12 nm) and exclusive economic zones (200 nm).',
        'A "Note Verbale" is a diplomatic note signed by the ambassador and addressed to another mission.',
        'A "Démarche" is a formal diplomatic representation or protest from one government to another.',
        '"Pacta sunt servanda" — agreements must be kept — is a fundamental principle of international law.',
        '"Jus cogens" refers to peremptory norms of international law that no state can violate.',
        'The principle of "sovereignty" means each state has supreme authority within its territory.',
        'The principle of "non-intervention" prohibits states from interfering in other states\' internal affairs.',
        'The principle of "self-determination" allows peoples to determine their own political status.',
        'The UN Partition Plan for Palestine (1947) proposed separate Arab and Jewish states.',
        'The Oslo Accords (1993) were a milestone in Israeli-Palestinian peace negotiations.',
        'The Iran Nuclear Deal (JCPOA) was signed in 2015 to limit Iran\'s nuclear program in exchange for sanctions relief.',
        'The Chemical Weapons Convention (CWC) prohibits the production and use of chemical weapons.',
        'The Biological Weapons Convention (BWC) prohibits the development and stockpiling of biological weapons.',
        'The Treaty on the Non-Proliferation of Nuclear Weapons (NPT) aims to prevent nuclear weapons spread.',
        'The Comprehensive Nuclear-Test-Ban Treaty (CTBT) bans all nuclear explosions, but has not yet entered into force.',
        'The Arms Trade Treaty (ATT) regulates the international trade in conventional weapons.',
        'The Kyoto Protocol (1997) was the first international treaty to set binding emissions reduction targets.',
        'The Montreal Protocol (1987) successfully phased out ozone-depleting substances.',
        'The Rome Statute (1998) established the International Criminal Court (ICC).',
        'The UN Declaration on the Rights of Indigenous Peoples (UNDRIP) was adopted in 2007.',
        'The Convention on the Elimination of All Forms of Discrimination Against Women (CEDAW) was adopted in 1979.',
        'The Convention on the Rights of the Child (CRC) is the most widely ratified human rights treaty.',
        'The International Covenant on Civil and Political Rights (ICCPR) protects individual freedoms.',
        'The International Covenant on Economic, Social and Cultural Rights (ICESCR) protects social and economic rights.',
        'The UN Convention Against Torture (CAT) prohibits torture under any circumstances.',
        'The UN Convention Against Corruption (UNCAC) is the only legally binding anti-corruption instrument.',
        'The UN Convention on Transnational Organized Crime (UNTOC) combats cross-border crime.',
        'The Palermo Protocols supplement UNTOC and address human trafficking, migrant smuggling, and firearms.',
        'The UN Global Compact is a voluntary initiative for businesses to adopt sustainable policies.',
        'The UN Human Rights Council uses a Universal Periodic Review (UPR) to assess all members\' human rights records.',
        'The UN Special Rapporteurs are independent experts who report on specific human rights issues.',
        'The UN Relief and Works Agency (UNRWA) provides aid to Palestinian refugees.',
        'The International Atomic Energy Agency (IAEA) promotes peaceful use of nuclear energy.',
        'The Organization for the Prohibition of Chemical Weapons (OPCW) oversees the Chemical Weapons Convention.',
        'The International Maritime Organization (IMO) sets global standards for shipping safety and pollution.',
        'The International Civil Aviation Organization (ICAO) sets global aviation standards.',
        'The International Labour Organization (ILO) sets international labor standards.',
        'The World Intellectual Property Organization (WIPO) protects intellectual property globally.',
        'The International Telecommunication Union (ITU) coordinates global telecom networks and spectrum.',
        'The Universal Postal Union (UPU) sets rules for international mail exchange.',
        'The World Meteorological Organization (WMO) coordinates global weather and climate data.',
        'The International Organization for Migration (IOM) promotes humane migration management.',
        'The UN Industrial Development Organization (UNIDO) promotes industrial development in poor countries.',
        'The Food and Agriculture Organization (FAO) leads international efforts to defeat hunger.',
        'The International Fund for Agricultural Development (IFAD) invests in rural development.',
        'The UN Human Settlements Programme (UN-Habitat) promotes sustainable urban development.',
        'The UN Office for the Coordination of Humanitarian Affairs (OCHA) coordinates emergency response.',
        'The UN Development Programme (UNDP) helps countries eliminate poverty and achieve sustainable growth.',
        'The UN Population Fund (UNFPA) focuses on reproductive health and population issues.',
        'The UN Children\'s Fund (UNICEF) provides humanitarian aid to children worldwide.',
        'UN Women works for gender equality and women\'s empowerment globally.',
        'The UN Institute for Disarmament Research (UNIDIR) researches disarmament and security issues.',
        'The UN University (UNU) is a global think tank and postgraduate teaching organization.',
        'The UN System Staff College (UNSSC) trains UN personnel.',
        'The UN Volunteers (UNV) program deploys volunteers to support peace and development.',
        'The UN Peacebuilding Commission helps countries recover from conflict.',
        'The UN Office on Drugs and Crime (UNODC) combats drug trafficking and organized crime.',
        'The UN Counter-Terrorism Office (UNOCT) coordinates UN counter-terrorism efforts.',
        'The UN Office for Outer Space Affairs (UNOOSA) promotes international cooperation in space.',
        'The UN Register of Conventional Arms tracks international arms transfers.',
        'The UN Disarmament Commission is a deliberative body on disarmament issues.',
        'The Conference on Disarmament is the world\'s single multilateral disarmament negotiating forum.',
        'The UN has observed over 70 peacekeeping missions since 1948.',
        'The largest UN peacekeeping mission was in Darfur (UNAMID) with nearly 20,000 personnel.',
        'The smallest UN peacekeeping mission is UNMOGIP in India/Pakistan with about 100 observers.',
        'The UN Truce Supervision Organization (UNTSO) has been monitoring ceasefires since 1948.',
        'The UN Interim Force in Lebanon (UNIFIL) has been operating since 1978.',
        'The UN Peacekeeping Force in Cyprus (UNFICYP) has been deployed since 1964.',
        'The UN Mission in South Sudan (UNMISS) is one of the largest current peacekeeping missions.',
        'The UN Stabilization Mission in the Democratic Republic of Congo (MONUSCO) protects civilians.',
        'The UN Multidimensional Integrated Stabilization Mission in Mali (MINUSMA) ended in 2023.',
        'The UN Assistance Mission in Afghanistan (UNAMA) supports peace and development.',
        'The UN Support Mission in Libya (UNSMIL) facilitates the political transition in Libya.',
        'The UN Mission in Kosovo (UNMIK) has administered Kosovo since 1999.',
        'The UN has Blue Helmets — peacekeepers who wear distinctive blue helmets or berets.',
        'UN peacekeepers come from 120+ contributing countries.',
        'The top contributors to UN peacekeeping are Bangladesh, Nepal, India, and Rwanda.',
        'Women in peacekeeping improve mission effectiveness and reduce conflict-related sexual violence.',
        'The UN Action Plan on Peacekeeping (A4P) aims to make missions more effective.',
        'The UN Secretary-General António Guterres (2017–present) is the 9th Secretary-General.',
        'Previous UN Secretaries-General: Trygve Lie, Dag Hammarskjöld, U Thant, Kurt Waldheim, Javier Pérez de Cuéllar, Boutros Boutros-Ghali, Kofi Annan, Ban Ki-moon.',
        'Dag Hammarskjöld is the only UN Secretary-General to die in office (1961 plane crash).',
        'Kofi Annan and the UN were jointly awarded the Nobel Peace Prize in 2001.',
        'The UN has faced criticism for inefficiency, bureaucracy, and failure to prevent genocides.',
        'The UN Security Council has been criticized for being undemocratic due to P5 veto power.',
        'Reform of the UN Security Council has been debated for decades — expanding permanent members is a key issue.',
        'The "Uniting for Peace" resolution allows the General Assembly to act when the Security Council is deadlocked.',
        'The UN budget is about $3.5 billion for the regular budget and $6.5 billion for peacekeeping.',
        'The US is the largest contributor to the UN budget, paying about 22% of the regular budget.',
        'The UN has its own postal administration and issues its own stamps.',
        'The UN flag shows the world map surrounded by olive branches — symbols of peace.',
        'UN Day is celebrated on October 24 each year.',
        'The UN has a dedicated channel on YouTube and live-streams many General Assembly debates.',
        'The UN Library in New York holds over 4 million items.',
        'The UN has a "UNite" app for delegates to access documents and schedules.',
        'The UN Chronicle is the UN\'s official quarterly magazine.',
        'The UN Academic Impact (UNAI) engages higher education institutions with UN goals.',
        'MUN conferences often follow the "Harvard" or "National" style of parliamentary procedure.',
        'The gavel is the symbol of the Chair\'s authority — one tap means "committee is in session."',
        'A "Roll Call" at the start of committee determines which delegates are present.',
        'The "Quorum" is the minimum number of delegates required to conduct a vote (usually 1/3 of members).',
        'A "Simple Majority" is more than half of the votes cast (excluding abstentions).',
        'A "Two-Thirds Majority" is required for important decisions like amending the agenda.',
        'A "Motion to Divide the House" calls for a vote on whether to proceed with a vote.',
        'A "Motion to Table" postpones debate on a resolution indefinitely.',
        'A "Motion to Adjourn" ends the committee session.',
        'A "Motion to Reconsider" allows a previously voted resolution to be debated again.',
        'A "Motion to Appeal the Chair\'s Ruling" challenges a decision by the Dais.',
        'A "Motion to Set the Agenda" determines which topic is debated first.',
        'A "Motion to Introduce a Resolution" brings a draft resolution to the floor.',
        'A "Motion to Move into Voting Procedure" ends debate and begins voting.',
        'A "Motion to Divide the Question" votes on parts of a resolution separately.',
        'A "Motion to Reorder Resolutions" changes the order in which resolutions are voted on.',
        'A "Motion to Suspend the Rules" temporarily sets aside parliamentary procedure.',
        'A "Motion to Adopt the Agenda" approves the committee\'s agenda for the session.',
        'A "Motion to Extend Debate" adds time to the current speaking session.',
        'A "Motion to Limit Debate" reduces speaking time or number of speakers.',
        'A "Motion to Close Debate" ends the debate and moves to voting.',
        'A "Motion to Postpone Debate" delays discussion on a topic to a later time.',
        'A "Motion to Refer to a Bloc" sends a resolution to a regional bloc for revision.',
        'A "Motion to Amend" proposes changes to a draft resolution.',
        'A "Friendly Amendment" is accepted by all sponsors and does not require a vote.',
        'An "Unfriendly Amendment" is opposed by a sponsor and requires a vote.',
        'A "Working Paper" does not require formal sponsorship — any delegate can draft one.',
        'A "Draft Resolution" requires a minimum number of sponsors (usually 1/4 of committee).',
        'A "Signatory" supports a resolution being debated but does not necessarily agree with its content.',
        'A "Sponsor" is a delegate who authored and supports a resolution.',
        'A "Co-Sponsor" is a delegate who formally supports a resolution.',
        'A "Non-Paper" is an informal document circulated for discussion without formal status.',
        'A "Position Paper" outlines a country\'s stance on the committee\'s topics.',
        'A "Policy Statement" is a short speech summarizing a country\'s position.',
        'A "Press Release" is a statement written as if from your country\'s foreign ministry.',
        'A "Communiqué" is an official statement issued after a meeting or summit.',
        'A "Joint Statement" is issued by multiple countries on a shared position.',
        'A "Declaration" is a formal statement of principles or intent.',
        'A "Memorandum of Understanding (MOU)" is a non-binding agreement between parties.',
        'A "Treaty" is a formally signed and ratified international agreement.',
        'A "Convention" is a legally binding agreement between states.',
        'A "Protocol" is an additional agreement that supplements a treaty or convention.',
        'A "Resolution" is a formal expression of the opinion or will of a UN body.',
        'UN General Assembly resolutions are non-binding but carry moral and political weight.',
        'UN Security Council resolutions are legally binding on all UN member states.',
        'The "Veto" power of the P5 has been used over 260 times since 1945.',
        'The Soviet Union/Russia has used the veto most frequently (over 140 times).',
        'The US has used the veto over 80 times, mostly on Israel-related resolutions.',
        'China has used the veto the least (about 20 times).',
        'The UK and France have not used their veto since 1989.',
        'A "Procedural Vote" in the UNSC requires 9 votes and cannot be vetoed.',
        'A "Substantive Vote" in the UNSC requires 9 votes and can be vetoed by any P5 member.',
        'Abstentions from P5 members do not count as vetoes in the UNSC.',
        'The UN General Assembly elects non-permanent UNSC members for 2-year terms.',
        'The UN General Assembly elects the UN Secretary-General on recommendation of the UNSC.',
        'The UN General Assembly approves the UN budget by a two-thirds majority.',
        'The UN General Assembly can suspend a member state for violating the UN Charter.',
        'The UN General Assembly can expel a member state for persistent Charter violations.',
        'The UN General Assembly elects judges to the International Court of Justice.',
        'The International Court of Justice has 15 judges elected for 9-year terms.',
        'The ICJ settles legal disputes between states and gives advisory opinions.',
        'Only states can bring cases to the ICJ — individuals and organizations cannot.',
        'The ICJ\'s decisions are binding and cannot be appealed.',
        'The ICC (International Criminal Court) prosecutes individuals, not states.',
        'The ICC has 123 member states — notable non-members include USA, China, Russia, India.',
        'The ICC has issued arrest warrants for leaders from Sudan, Libya, Russia, and others.',
        'The principle of "Complementarity" means the ICC only acts when national courts cannot or will not.',
        'The "Rome Statute" established the ICC and defines its jurisdiction.',
        'The ICC can prosecute genocide, crimes against humanity, war crimes, and aggression.',
        'The crime of "Aggression" was added to the ICC\'s jurisdiction in 2018.',
        'Genocide is defined as acts committed with intent to destroy a national, ethnic, racial, or religious group.',
        'Crimes against humanity include murder, enslavement, torture, and persecution on a widespread scale.',
        'War crimes include grave breaches of the Geneva Conventions and other serious violations of IHL.',
        'International Humanitarian Law (IHL) governs the conduct of armed conflict.',
        'The principle of "Distinction" requires parties to distinguish between combatants and civilians.',
        'The principle of "Proportionality" prohibits attacks where civilian harm outweighs military gain.',
        'The principle of "Precaution" requires parties to take steps to minimize civilian harm.',
        'The "Martens Clause" says that in cases not covered by law, civilians remain under principles of humanity.',
        'The "Hague Conventions" (1899, 1907) established laws of war and neutrality.',
        'The "Geneva Conventions" (1949) protect wounded soldiers, shipwrecked, POWs, and civilians.',
        'The "Additional Protocols" (1977) to the Geneva Conventions expanded protections in civil wars.',
        'The use of chemical and biological weapons is prohibited under international law.',
        'The use of landmines is restricted under the Ottawa Treaty (1997).',
        'The use of cluster munitions is prohibited under the Oslo Convention (2008).',
        'Nuclear weapons are not explicitly prohibited by treaty but are regulated under the NPT.',
        'The Treaty on the Prohibition of Nuclear Weapons (TPNW) entered into force in 2021.',
        'The "Nuclear Umbrella" refers to a nuclear-armed state\'s guarantee to defend allies.',
        'The "Mutually Assured Destruction (MAD)" doctrine deterred nuclear war during the Cold War.',
        'The "Cold War" (1947–1991) was a period of geopolitical tension between USA and USSR.',
        'The "Non-Aligned Movement" emerged during the Cold War as a bloc of neutral countries.',
        'The "Bretton Woods System" (1944) established the IMF and World Bank.',
        'The "Marshall Plan" (1948) was the US program to rebuild Europe after WWII.',
        'The "Truman Doctrine" (1947) committed the US to containing communism.',
        'The "Monroe Doctrine" (1823) declared the Western Hemisphere off-limits to European colonization.',
        'The "Westphalian Sovereignty" (1648) established the modern concept of state sovereignty.',
        'The "Congress of Vienna" (1815) redrew European borders after the Napoleonic Wars.',
        'The "League of Nations" (1920–1946) was the precursor to the United Nations.',
        'The "Treaty of Versailles" (1919) ended WWI and created the League of Nations.',
        'The "Yalta Conference" (1945) shaped the post-WWII order and led to the UN\'s creation.',
        'The "San Francisco Conference" (1945) drafted the UN Charter.',
        'The "Bandung Conference" (1955) marked the birth of the Non-Aligned Movement.',
        'The "Helsinki Accords" (1975) improved East-West relations during the Cold War.',
        'The "Dayton Accords" (1995) ended the Bosnian War.',
        'The "Good Friday Agreement" (1998) ended the Troubles in Northern Ireland.',
        'The "Camp David Accords" (1978) led to the Egypt-Israel peace treaty.',
        'The "Abraham Accords" (2020) normalized relations between Israel and several Arab states.',
        'The "Oslo Accords" (1993) established the Palestinian Authority.',
        'The "Sykes-Picot Agreement" (1916) divided Ottoman territories after WWI.',
        'The "Balfour Declaration" (1917) supported a Jewish homeland in Palestine.',
        'The "Suez Crisis" (1956) demonstrated the declining power of Britain and France.',
        'The "Cuban Missile Crisis" (1962) was the closest the world came to nuclear war.',
        'The "Fall of the Berlin Wall" (1989) symbolized the end of the Cold War.',
        'The "9/11 Attacks" (2001) reshaped global security and counter-terrorism efforts.',
        'The "Arab Spring" (2010–2012) led to regime changes across the Middle East.',
        'The "Annexation of Crimea" (2014) by Russia led to international sanctions.',
        'The "Russia-Ukraine War" (2022–present) has caused the largest refugee crisis in Europe since WWII.',
        'The "Israel-Hamas War" (2023–present) has caused a major humanitarian crisis in Gaza.',
        'The "Climate Crisis" is the defining global challenge of the 21st century.',
        'The "Paris Agreement" (2015) aims to limit global warming to well below 2°C.',
        'The "COP" (Conference of the Parties) is the annual UN climate conference.',
        'COP28 (2023) was held in Dubai and focused on the Global Stocktake.',
        'The "Kigali Amendment" (2016) phases down hydrofluorocarbons (HFCs) under the Montreal Protocol.',
        'The "Biodiversity Convention" (CBD) aims to protect global biodiversity.',
        'The "Desertification Convention" (UNCCD) combats land degradation.',
        'The "Ramsar Convention" protects wetlands of international importance.',
        'The "World Heritage Convention" protects cultural and natural heritage sites.',
        'The "Basel Convention" controls transboundary movements of hazardous wastes.',
        'The "Rotterdam Convention" regulates trade in hazardous chemicals.',
        'The "Stockholm Convention" bans or restricts persistent organic pollutants (POPs).',
        'The "Minamata Convention" addresses mercury pollution.',
        'The "Vienna Convention" (1985) and Montreal Protocol (1987) protect the ozone layer.',
        'The "UN Framework Convention on Climate Change (UNFCCC)" was adopted in 1992.',
        'The "Kyoto Protocol" (1997) set binding emissions targets for developed countries.',
        'The "Copenhagen Accord" (2009) was a non-binding climate agreement.',
        'The "Sendai Framework" (2015) sets goals for disaster risk reduction.',
        'The "Addis Ababa Action Agenda" (2015) addresses development financing.',
        'The "Samoa Pathway" (2014) focuses on sustainable development of small island states.',
        'The "New Urban Agenda" (2016) guides sustainable urbanization.',
        'The "Global Compact for Migration" (2018) promotes safe migration.',
        'The "Global Compact on Refugees" (2018) improves refugee response.',
        'The "Women, Peace and Security Agenda" (UNSCR 1325) recognizes women\'s role in peacebuilding.',
        'The "Youth, Peace and Security Agenda" (UNSCR 2250) engages youth in peace efforts.',
        'The "Protection of Civilians" is a core mandate of UN peacekeeping missions.',
        'The "Children and Armed Conflict" agenda protects children in war zones.',
        'The "Humanitarian-Development-Peace Nexus" links relief, development, and peacebuilding.',
        'The "Triple Nexus" approach coordinates humanitarian, development, and peace efforts.',
        'The "Grand Bargain" reforms humanitarian financing to be more efficient.',
        'The "Agenda for Humanity" outlines 5 core responsibilities for humanitarian action.',
        'The "World Humanitarian Summit" (2016) committed to transformative humanitarian action.',
        'The "Global Humanitarian Overview" is the UN\'s annual humanitarian appeal.',
        'The "Central Emergency Response Fund (CERF)" provides rapid humanitarian funding.',
        'The "Country-Based Pooled Funds (CBPFs)" support local humanitarian response.',
        'The "Humanitarian Principles" are humanity, neutrality, impartiality, and independence.',
        'The "Do No Harm" principle ensures aid does not worsen conflict.',
        'The "Protection Mainstreaming" integrates protection into all humanitarian action.',
        'The "Accountability to Affected Populations (AAP)" ensures aid is accountable to communities.',
        'The "Prevention of Sexual Exploitation and Abuse (PSEA)" is a UN priority.',
        'The "UN Protocol on Allegations of Sexual Exploitation and Abuse" ensures accountability.',
        'The "Victims\' Rights Advocate" supports victims of sexual exploitation by UN personnel.',
        'The "UN Ethics Office" promotes ethical conduct across the UN system.',
        'The "UN Ombudsman" resolves workplace disputes informally.',
        'The "UN Dispute Tribunal" resolves employment disputes.',
        'The "UN Appeals Tribunal" hears appeals from the Dispute Tribunal.',
        'The "UN Joint Staff Pension Fund" provides retirement benefits to UN staff.',
        'The "UN Development System Reform" (2018) improved coordination of UN country teams.',
        'The "UN Management Reform" (2018) streamlined UN administration.',
        'The "UN Data Strategy" (2020) improves data-driven decision making.',
        'The "UN Digital Transformation Strategy" guides the UN\'s digital evolution.',
        'The "UN Innovation Network" fosters innovation across the UN system.',
        'The "UN Lab for Organizational Change" experiments with new ways of working.',
        'The "UN Young Leaders for the SDGs" recognizes young change-makers.',
        'The "UN Volunteers" program has deployed over 50,000 volunteers since 1971.',
        'The "UN Global Service Centre" in Brindisi, Italy, supports peacekeeping logistics.',
        'The "UN Humanitarian Response Depot (UNHRD)" in Dubai pre-positions emergency supplies.',
        'The "UN Air Service (UNHAS)" provides air transport for humanitarian workers.',
        'The "UN Satellite Centre (UNOSAT)" provides satellite imagery for humanitarian analysis.',
        'The "UN Platform for Space-based Information for Disaster Management (UN-SPIDER)" uses space tech for disasters.',
        'The "UN Office for Disaster Risk Reduction (UNDRR)" coordinates disaster risk reduction.',
        'The "UN Climate Change Secretariat (UNFCCC)" supports climate negotiations.',
        'The "UN Convention to Combat Desertification (UNCCD)" addresses land degradation.',
        'The "UN Environment Assembly (UNEA)" is the world\'s highest-level environmental forum.',
        'The "UN Science-Policy-Business Forum" connects science, policy, and business for the environment.',
        'The "UN Decade on Ecosystem Restoration" (2021–2030) aims to restore degraded ecosystems.',
        'The "UN Decade of Ocean Science for Sustainable Development" (2021–2030) supports ocean health.',
        'The "UN Decade of Action" (2020–2030) accelerates progress on the SDGs.',
        'The "UN Decade of Family Farming" (2019–2028) supports smallholder farmers.',
        'The "UN Decade of Indigenous Languages" (2022–2032) preserves indigenous languages.',
        'The "UN Decade of Healthy Ageing" (2021–2030) improves older people\'s lives.',
        'The "UN Decade of Education for Sustainable Development" (2005–2014) promoted sustainability education.',
        'The "UN Literacy Decade" (2003–2012) improved global literacy.',
        'The "UN Water Decade" (2005–2015) addressed water and sanitation issues.',
        'The "UN Decade for Deserts and the Fight Against Desertification" (2010–2020) addressed desertification.',
        'The "UN Decade for Human Rights Education" (1995–2004) promoted human rights learning.',
        'The "UN Decade for the Eradication of Poverty" (1997–2006) focused on poverty reduction.',
        'The "UN Decade for a Culture of Peace" (2001–2010) promoted peace education.',
        'The "UN Decade for Women" (1976–1985) advanced women\'s rights globally.',
        'The "UN Decade for the World\'s Indigenous People" (1995–2004) raised indigenous issues.',
        'The "UN Decade of Sustainable Energy for All" (2014–2024) promoted clean energy.',
        'The "UN Decade of Nutrition" (2016–2025) addresses malnutrition.',
        'The "UN Decade of Action on Road Safety" (2021–2030) reduces road traffic deaths.',
        'The "UN Decade of Family Farming" (2019–2028) supports family farmers.',
        'The "UN Decade of Ocean Science" (2021–2030) advances ocean research.',
        'The "UN Decade on Restoration" (2021–2030) aims to restore 350 million hectares of ecosystems.',
        'The "UN Decade of Action for the SDGs" calls for accelerated solutions.',
        'The "SDG 1" is No Poverty — end poverty in all its forms everywhere.',
        'The "SDG 2" is Zero Hunger — end hunger, achieve food security.',
        'The "SDG 3" is Good Health and Well-being — ensure healthy lives.',
        'The "SDG 4" is Quality Education — inclusive and equitable education for all.',
        'The "SDG 5" is Gender Equality — achieve gender equality and empower women.',
        'The "SDG 6" is Clean Water and Sanitation — ensure water access for all.',
        'The "SDG 7" is Affordable and Clean Energy — ensure access to modern energy.',
        'The "SDG 8" is Decent Work and Economic Growth — promote sustained economic growth.',
        'The "SDG 9" is Industry, Innovation and Infrastructure — build resilient infrastructure.',
        'The "SDG 10" is Reduced Inequalities — reduce inequality within and among countries.',
        'The "SDG 11" is Sustainable Cities and Communities — make cities inclusive and sustainable.',
        'The "SDG 12" is Responsible Consumption and Production — ensure sustainable patterns.',
        'The "SDG 13" is Climate Action — take urgent action to combat climate change.',
        'The "SDG 14" is Life Below Water — conserve and sustainably use oceans.',
        'The "SDG 15" is Life on Land — protect and restore terrestrial ecosystems.',
        'The "SDG 16" is Peace, Justice and Strong Institutions — promote peaceful societies.',
        'The "SDG 17" is Partnerships for the Goals — strengthen global partnerships.',
        'The "Leave No One Behind" is the central promise of the 2030 Agenda.',
        'The "Five Ps" of the SDGs are People, Planet, Prosperity, Peace, and Partnership.',
        'The "High-Level Political Forum (HLPF)" reviews SDG progress annually.',
        'The "Voluntary National Reviews (VNRs)" track national SDG implementation.',
        'The "Global Sustainable Development Report (GSDR)" assesses SDG progress.',
        'The "SDG Summit" (2023) marked the halfway point to 2030.',
        'The "Summit of the Future" (2024) aims to strengthen global governance.',
        'The "Our Common Agenda" is the UN Secretary-General\'s vision for the future.',
        'The "New Agenda for Peace" proposes reforms to the UN\'s peace and security architecture.',
        'The "Global Digital Compact" aims to govern digital technology and AI.',
        'The "Declaration on Future Generations" commits to protecting future generations.',
        'The "Emergency Platform" proposal would improve crisis response coordination.',
        'The "UN 2.0" initiative modernizes the UN through data, digital, innovation, and behavioral science.',
        'The "UN Foundation" mobilizes support for UN causes.',
        'The "UN Association" movement in various countries advocates for the UN.',
        'The "Model UN" movement has grown to over 400 conferences annually worldwide.',
        'The largest MUN conference is NMUN (National Model UN) in New York with 5,000+ participants.',
        'The "Harvard National Model UN (HNMUN)" is one of the oldest and largest MUN conferences.',
        'The "World Model UN (WMUN)" is held at UN headquarters in New York.',
        'The "European International Model UN (TEIMUN)" is held in The Hague.',
        'The "MUN Refugee Challenge" raises awareness about refugee issues.',
        'The "MUN Impact" initiative connects MUN to real-world action.',
        'The "Best Delegate" award recognizes the most skilled delegate in a committee.',
        'The "Honorable Mention" award recognizes outstanding delegates.',
        'The "Verbal Commendation" is a recognition for notable contributions.',
        'The "Research Award" recognizes the most well-prepared delegate.',
        'The "Diplomacy Award" recognizes exceptional diplomatic skills.',
        'The "Position Paper Award" recognizes the best-written position paper.',
        'The "Gavel" is the ultimate award — given to the best delegate in a committee.',
        'In MUN, "Blocs" are groups of countries with shared interests (e.g., EU, Arab League, ASEAN).',
        'The "African Bloc" coordinates positions of African countries in MUN.',
        'The "Arab Bloc" coordinates positions of Arab League members.',
        'The "EU Bloc" coordinates positions of European Union members.',
        'The "Asian Bloc" coordinates positions of Asian countries.',
        'The "Latin American Bloc" (GRULAC) coordinates positions of Latin American countries.',
        'The "Nordic Bloc" coordinates positions of Scandinavian countries.',
        'The "Small Island Developing States (SIDS)" bloc advocates for climate action.',
        'The "Landlocked Developing Countries (LLDCs)" bloc advocates for trade access.',
        'The "Least Developed Countries (LDCs)" bloc advocates for development support.',
        'The "BRICS" (Brazil, Russia, India, China, South Africa) is a major economic bloc.',
        'The "MINT" (Mexico, Indonesia, Nigeria, Turkey) are emerging economies.',
        'The "MIKTA" (Mexico, Indonesia, South Korea, Turkey, Australia) is a middle-power grouping.',
        'The "Visegrad Group" (V4) is a cultural and political alliance of Central European states.',
        'The "Nordic Council" is a regional cooperation forum of Nordic countries.',
        'The "Baltic Assembly" promotes cooperation between Estonia, Latvia, and Lithuania.',
        'The "Benelux Union" is a political-economic union of Belgium, Netherlands, and Luxembourg.',
        'The "Gulf Cooperation Council (GCC)" unites six Gulf Arab states.',
        'The "ASEAN" (Association of Southeast Asian Nations) promotes regional stability.',
        'The "SAARC" (South Asian Association for Regional Cooperation) promotes South Asian cooperation.',
        'The "SCO" (Shanghai Cooperation Organisation) is a Eurasian security alliance.',
        'The "CSTO" (Collective Security Treaty Organization) is a Russian-led military alliance.',
        'The "ANZUS" is a security treaty between Australia, New Zealand, and the US.',
        'The "Five Eyes" is an intelligence alliance of US, UK, Canada, Australia, and New Zealand.',
        'The "Quad" (Quadrilateral Security Dialogue) includes US, Japan, India, and Australia.',
        'The "AUKUS" is a security pact between Australia, UK, and US.',
        'The "IPEF" (Indo-Pacific Economic Framework) is a US-led economic initiative.',
        'The "Belt and Road Initiative (BRI)" is China\'s global infrastructure project.',
        'The "Global Gateway" is the EU\'s infrastructure investment strategy.',
        'The "Digital Silk Road" is China\'s digital connectivity initiative.',
        'The "Polar Silk Road" is China\'s Arctic infrastructure project.',
        'The "Indo-Pacific Strategy" is the US approach to the Indo-Pacific region.',
        'The "Global Britain" is the UK\'s post-Brexit foreign policy vision.',
        'The "European Strategic Autonomy" aims for EU independence in defense.',
        'The "Neighborhood First" is India\'s policy toward its neighbors.',
        'The "Look East/Act East" is India\'s policy toward Southeast Asia.',
        'The "Vision 2030" is Saudi Arabia\'s economic diversification plan.',
        'The "Korea Peace Process" aimed at denuclearizing the Korean Peninsula.',
        'The "Two-State Solution" envisions Israel and Palestine living side by side in peace.',
        'The "One-China Policy" states there is only one China and Taiwan is part of China.',
        'The "Sunshine Policy" was South Korea\'s engagement policy toward North Korea.',
        'The "Maximum Pressure" campaign was the US policy of sanctions on Iran.',
        'The "Strategic Competition" defines current US-China relations.',
        'The "De-risking" is the EU\'s approach to reducing economic dependence on China.',
        'The "Decoupling" refers to separating economies from China.',
        'The "Friend-shoring" means shifting supply chains to allied countries.',
        'The "Near-shoring" means moving production closer to the consumer market.',
        'The "Global South" refers to developing countries in Asia, Africa, and Latin America.',
        'The "Global North" refers to developed countries in North America, Europe, and parts of Asia.',
        'The "North-South Divide" describes the economic gap between developed and developing nations.',
        'The "South-South Cooperation" is development cooperation between developing countries.',
        'The "Triangular Cooperation" involves two developing countries with support from a developed country.',
        'The "Official Development Assistance (ODA)" is government aid for developing countries.',
        'The "Foreign Direct Investment (FDI)" is investment by a company in a foreign country.',
        'The "Special Drawing Rights (SDRs)" are IMF reserve assets.',
        'The "Debt Sustainability" ensures countries can repay their debts without sacrificing development.',
        'The "Debt-for-Nature Swaps" exchange debt relief for environmental protection.',
        'The "Carbon Credits" allow countries to offset emissions by funding green projects.',
        'The "Emissions Trading" is a market-based approach to reducing pollution.',
        'The "Carbon Border Adjustment Mechanism (CBAM)" is the EU\'s carbon tariff.',
        'The "Just Transition" ensures the shift to green energy is fair and inclusive.',
        'The "Energy Transition" is the shift from fossil fuels to renewable energy.',
        'The "Energy Security" ensures reliable access to affordable energy.',
        'The "Food Security" means all people have access to sufficient, safe food.',
        'The "Water Security" ensures access to clean water for all.',
        'The "Health Security" protects populations from health threats.',
        'The "Cybersecurity" protects systems and data from digital attacks.',
        'The "Hybrid Threats" combine military and non-military means of aggression.',
        'The "Disinformation" is false information spread deliberately to deceive.',
        'The "Misinformation" is false information spread without malicious intent.',
        'The "Malinformation" is true information shared with intent to harm.',
        'The "Information Warfare" uses information to gain a strategic advantage.',
        'The "Cognitive Warfare" targets how people think and make decisions.',
        'The "Economic Warfare" uses economic measures to weaken an adversary.',
        'The "Trade War" involves tariffs and trade barriers between countries.',
        'The "Currency War" involves competitive devaluation of currencies.',
        'The "Sanctions" are economic penalties imposed on a country to change its behavior.',
        'The "Embargo" is a complete ban on trade with a country.',
        'The "Boycott" is a refusal to buy goods from a country or company.',
        'The "Divestment" is selling investments in a country or company for political reasons.',
        'The "Blockade" is the isolation of a place to prevent goods or people from entering.',
        'The "No-Fly Zone" prohibits aircraft from flying over a designated area.',
        'The "Buffer Zone" is a neutral area separating hostile forces.',
        'The "Demilitarized Zone (DMZ)" is an area where military activity is prohibited.',
        'The "Safe Zone" is an area designated for civilian protection during conflict.',
        'The "Humanitarian Corridor" allows safe passage of aid during conflict.',
        'The "Ceasefire" is a temporary halt to fighting.',
        'The "Truce" is a longer-term suspension of hostilities.',
        'The "Armistice" is a formal agreement to end fighting.',
        'The "Peace Treaty" is a formal agreement to end a war.',
        'The "Peacekeeping" involves UN forces monitoring ceasefires and protecting civilians.',
        'The "Peace Enforcement" uses military force to restore peace.',
        'The "Peacebuilding" addresses root causes of conflict to prevent recurrence.',
        'The "Peacemaking" involves diplomatic efforts to end conflict.',
        'The "Conflict Prevention" takes action to prevent violent conflict.',
        'The "Early Warning" systems detect signs of impending conflict.',
        'The "Mediation" involves a third party helping to resolve a dispute.',
        'The "Good Offices" is diplomatic intervention by a neutral party.',
        'The "Fact-Finding Mission" investigates allegations of human rights violations.',
        'The "Commission of Inquiry" investigates serious violations of international law.',
        'The "International Tribunal" prosecutes serious international crimes.',
        'The "Hybrid Court" combines international and national elements.',
        'The "Truth Commission" investigates past human rights abuses.',
        'The "Lustration" removes officials associated with a previous regime.',
        'The "Transitional Justice" addresses human rights violations during transitions.',
        'The "Reparations" compensate victims of human rights violations.',
        'The "Restorative Justice" focuses on repairing harm rather than punishment.',
        'The "Retributive Justice" focuses on punishing perpetrators.',
        'The "Distributive Justice" focuses on fair allocation of resources.',
        'The "Environmental Justice" addresses unequal environmental burdens.',
        'The "Climate Justice" links climate change to social justice.',
        'The "Energy Justice" ensures fair access to energy.',
        'The "Water Justice" ensures fair access to water resources.',
        'The "Food Justice" ensures fair access to healthy food.',
        'The "Health Justice" ensures fair access to healthcare.',
        'The "Digital Justice" ensures fair access to digital technology.',
        'The "Data Justice" ensures fair treatment in data collection and use.',
        'The "Algorithmic Justice" ensures fairness in AI and algorithms.',
        'The "Intergenerational Justice" considers the rights of future generations.',
        'The "Global Justice" addresses justice issues at the international level.',
        'The "Cosmopolitan Justice" argues for global duties to all humans.',
        'The "Human Security" focuses on protecting individuals, not just states.',
        'The "Responsibility to Protect (R2P)" has three pillars: state responsibility, international assistance, and timely response.',
        'The "Humanitarian Intervention" uses force to protect civilians — controversial under international law.',
        'The "Doctrine of Preemption" allows strikes against imminent threats.',
        'The "Doctrine of Prevention" allows strikes against potential future threats.',
        'The "Doctrine of Containment" seeks to prevent the expansion of an adversary.',
        'The "Doctrine of Deterrence" uses the threat of retaliation to prevent attack.',
        'The "Doctrine of Collective Security" says an attack on one is an attack on all.',
        'The "Doctrine of Collective Defense" (NATO Article 5) commits allies to mutual defense.',
        'The "Doctrine of Neutrality" means a state does not take sides in conflicts.',
        'The "Doctrine of Non-Alignment" means a state does not join military blocs.',
        'The "Doctrine of Isolationism" means a state avoids foreign alliances.',
        'The "Doctrine of Internationalism" means active engagement in global affairs.',
        'The "Doctrine of Multilateralism" means coordinating policy with multiple countries.',
        'The "Doctrine of Bilateralism" means direct engagement between two countries.',
        'The "Doctrine of Unilateralism" means acting without other countries.',
        'The "Soft Power" is the ability to attract and persuade without force.',
        'The "Hard Power" is the use of military and economic coercion.',
        'The "Smart Power" combines soft and hard power effectively.',
        'The "Sharp Power" uses manipulation and disinformation to influence.',
        'The "Sticky Power" creates economic dependencies that bind countries together.',
        'The "Structural Power" shapes the rules and institutions of the international system.',
        'The "Hegemony" is dominance of one state over others.',
        'The "Polarity" describes the distribution of power in the international system.',
        'A "Unipolar" system has one dominant power (US post-Cold War).',
        'A "Bipolar" system has two dominant powers (US-USSR Cold War).',
        'A "Multipolar" system has multiple centers of power (current emerging system).',
        'A "Non-Polar" system has no clear dominant power.',
        'The "Thucydides Trap" describes tensions when a rising power challenges an established one.',
        'The "Security Dilemma" occurs when one state\'s security measures threaten others.',
        'The "Arms Race" is competitive military buildup between states.',
        'The "Prisoner\'s Dilemma" in IR explains why cooperation is difficult between states.',
        'The "Tragedy of the Commons" explains overuse of shared resources.',
        'The "Collective Action Problem" explains why groups fail to cooperate.',
        'The "Free Rider Problem" occurs when some benefit without contributing.',
        'The "Moral Hazard" occurs when protection encourages risk-taking.',
        'The "Principal-Agent Problem" occurs when an agent acts against the principal\'s interest.',
        'The "Rational Choice Theory" assumes states act in their self-interest.',
        'The "Game Theory" models strategic interactions between rational actors.',
        'The "Deterrence Theory" explains how threats prevent action.',
        'The "Compellence Theory" explains how threats change existing behavior.',
        'The "Coercive Diplomacy" uses threats and limited force to change behavior.',
        'The "Diplomatic Recognition" is the formal acknowledgment of a state or government.',
        'The "De Jure Recognition" is legal recognition under international law.',
        'The "De Facto Recognition" acknowledges a government\'s actual control.',
        'The "Constitutive Theory" says recognition creates statehood.',
        'The "Declarative Theory" says statehood exists regardless of recognition.',
        'The "Montevideo Convention" (1933) defines the criteria for statehood: permanent population, defined territory, government, and capacity to enter relations.',
        'The "Estrada Doctrine" holds that recognition of governments is unnecessary.',
        'The "Hallstein Doctrine" (1955) said West Germany would not recognize states that recognized East Germany.',
        'The "One-China Policy" is the diplomatic recognition of China over Taiwan.',
        'The "Two Chinas" policy would recognize both China and Taiwan.',
        'The "Cross-Strait Relations" refers to relations between China and Taiwan.',
        'The "Hong Kong Basic Law" governs Hong Kong under "One Country, Two Systems."',
        'The "Macau Basic Law" governs Macau under "One Country, Two Systems."',
        'The "Tibet Autonomous Region" has special status within China.',
        'The "Xinjiang" region in China has been subject to international human rights concerns.',
        'The "Uyghur" minority in Xinjiang has faced allegations of repression.',
        'The "Rohingya" minority in Myanmar has faced persecution and genocide allegations.',
        'The "Kashmir" dispute between India and Pakistan dates to 1947.',
        'The "Line of Control (LoC)" divides Indian and Pakistani Kashmir.',
        'The "Siachen Glacier" is the world\'s highest battlefield (India-Pakistan).',
        'The "Water Disputes" in South Asia involve the Indus Waters Treaty.',
        'The "Indus Waters Treaty" (1960) governs water sharing between India and Pakistan.',
        'The "Mekong River Commission" manages the Mekong River\'s resources.',
        'The "Nile River Basin" involves water disputes among 11 African countries.',
        'The "Grand Ethiopian Renaissance Dam (GERD)" has caused tensions between Egypt, Sudan, and Ethiopia.',
        'The "South China Sea" disputes involve China, Vietnam, Philippines, Malaysia, Brunei, and Taiwan.',
        'The "Nine-Dash Line" is China\'s claim in the South China Sea.',
        'The "UNCLOS Arbitration" (2016) ruled against China\'s South China Sea claims.',
        'The "East China Sea" disputes involve China and Japan over the Senkaku/Diaoyu Islands.',
        'The "Dokdo/Takeshima" dispute involves South Korea and Japan.',
        'The "Kuril Islands/Northern Territories" dispute involves Russia and Japan.',
        'The "Falkland Islands/Malvinas" dispute involves UK and Argentina.',
        'The "Gibraltar" dispute involves UK and Spain.',
        'The "Crimea" dispute involves Russia and Ukraine.',
        'The "Donbas" region in eastern Ukraine has been a conflict zone since 2014.',
        'The "Transnistria" is a breakaway state in Moldova.',
        'The "Abkhazia" and "South Ossetia" are breakaway regions in Georgia.',
        'The "Nagorno-Karabakh" was a disputed territory between Armenia and Azerbaijan.',
        'The "Cyprus" dispute involves Greek and Turkish Cypriots.',
        'The "Western Sahara" dispute involves Morocco and the Sahrawi Arab Democratic Republic.',
        'The "Somaliland" is a de facto independent region in Somalia.',
        'The "Taiwan" is a self-governing island claimed by China.',
        'The "Palestine" is a non-member observer state at the UN.',
        'The "Vatican City/Holy See" is a non-member observer state at the UN.',
        'The "Kosovo" is a partially recognized state in the Balkans.',
        'The "Northern Cyprus" is recognized only by Turkey.',
        'The "Artsakh" (Nagorno-Karabakh) ceased to exist in 2024.',
        'The "Catalonia" independence movement seeks separation from Spain.',
        'The "Scotland" independence movement seeks separation from the UK.',
        'The "Quebec" sovereignty movement seeks separation from Canada.',
        'The "Kurdistan" independence movement seeks a Kurdish state.',
        'The "Balochistan" independence movement seeks separation from Pakistan and Iran.',
        'The "Bougainville" is an autonomous region moving toward independence from Papua New Guinea.',
        'The "New Caledonia" is a French territory with independence movements.',
        'The "Puerto Rico" is a US territory with statehood and independence debates.',
        'The "Greenland" is a Danish territory moving toward independence.',
        'The "Faroe Islands" are a Danish territory with independence movements.',
        'The "Åland Islands" are a demilitarized, autonomous region of Finland.',
        'The "Svalbard" is a Norwegian territory with special treaty status.',
        'The "Antarctica" is governed by the Antarctic Treaty System — no country owns it.',
        'The "Arctic" is governed by the Arctic Council and UNCLOS.',
        'The "Outer Space" is governed by the Outer Space Treaty (1967).',
        'The "Moon Agreement" (1984) says the moon is the common heritage of humanity.',
        'The "High Seas" are governed by the UN Convention on the Law of the Sea.',
        'The "International Seabed Authority (ISA)" manages deep-sea mining.',
        'The "Area" (deep seabed) is the common heritage of humanity.',
        'The "Global Commons" include the high seas, atmosphere, Antarctica, and outer space.',
        'The "Digital Commons" include open-source software and open data.',
        'The "Knowledge Commons" include shared scientific and cultural knowledge.',
        'The "Cultural Commons" include shared cultural heritage.',
        'The "Urban Commons" include shared urban spaces and resources.',
        'The "Social Commons" include shared social services and welfare.',
        'The "Health Commons" include shared health knowledge and resources.',
        'The "Education Commons" include shared educational resources.',
        'The "Information Commons" include shared information and data.',
        'The "Internet Governance" involves multi-stakeholder coordination of the internet.',
        'The "ICANN" coordinates domain names and IP addresses globally.',
        'The "Internet Governance Forum (IGF)" discusses internet policy issues.',
        'The "Net Neutrality" is the principle that all internet traffic should be treated equally.',
        'The "Digital Divide" is the gap between those with and without internet access.',
        'The "AI Governance" is an emerging field of international regulation.',
        'The "AI Safety" addresses risks from advanced artificial intelligence.',
        'The "AI Ethics" addresses moral questions about AI development and use.',
        'The "Gene Editing" (CRISPR) raises ethical questions about human modification.',
        'The "Human Enhancement" technologies raise ethical and regulatory questions.',
        'The "Autonomous Weapons Systems (LAWS)" are weapons that select and engage targets without human control.',
        'The "Lethal Autonomous Weapons (LAWS)" are a major topic of UN disarmament discussions.',
        'The "Killer Robots" debate at the UN focuses on banning autonomous weapons.',
        'The "Cybersecurity" is a growing area of international cooperation and conflict.',
        'The "Cyber Warfare" involves state-sponsored cyber attacks.',
        'The "Cyber Norms" are emerging rules for responsible state behavior in cyberspace.',
        'The "Tallinn Manual" analyzes how international law applies to cyber warfare.',
        'The "Budapest Convention" is the first international treaty on cybercrime.',
        'The "Data Localization" requires data to be stored within a country\'s borders.',
        'The "Data Sovereignty" is the concept that data is subject to the laws of the country where it is collected.',
        'The "Digital Sovereignty" is a country\'s control over its digital infrastructure.',
        'The "Technological Sovereignty" is a country\'s independence in technology.',
        'The "Economic Sovereignty" is a country\'s control over its economy.',
        'The "Energy Sovereignty" is a country\'s control over its energy resources.',
        'The "Food Sovereignty" is a community\'s right to define its own food systems.',
        'The "Health Sovereignty" is a country\'s control over its health policy.',
        'The "Vaccine Sovereignty" is a country\'s ability to produce its own vaccines.',
        'The "Vaccine Diplomacy" uses vaccines as a tool of foreign policy.',
        'The "Health Diplomacy" uses health cooperation to build international relationships.',
        'The "Science Diplomacy" uses scientific cooperation to build bridges.',
        'The "Cultural Diplomacy" uses cultural exchange to build understanding.',
        'The "Sports Diplomacy" uses sports to build international relationships.',
        'The "Ping Pong Diplomacy" (1971) improved US-China relations through table tennis.',
        'The "Basketball Diplomacy" has been used to engage with Cuba and North Korea.',
        'The "Cricket Diplomacy" has been used in India-Pakistan relations.',
        'The "Football Diplomacy" has been used in various conflict contexts.',
        'The "Track I Diplomacy" is official government-to-government diplomacy.',
        'The "Track II Diplomacy" is unofficial dialogue between non-governmental actors.',
        'The "Track III Diplomacy" is people-to-people peacebuilding.',
        'The "Multi-Track Diplomacy" coordinates multiple levels of diplomatic engagement.',
        'The "Shuttle Diplomacy" involves a mediator traveling between parties.',
        'The "Summit Diplomacy" involves direct meetings between heads of state.',
        'The "Public Diplomacy" engages foreign publics to advance national interests.',
        'The "Digital Diplomacy" (Twiplomacy) uses social media for diplomatic engagement.',
        'The "Economic Diplomacy" uses economic tools to achieve foreign policy goals.',
        'The "Defense Diplomacy" uses military cooperation to build relationships.',
        'The "Environmental Diplomacy" addresses transboundary environmental issues.',
        'The "Climate Diplomacy" focuses on international climate change negotiations.',
        'The "Water Diplomacy" addresses transboundary water disputes.',
        'The "Ocean Diplomacy" addresses maritime issues and ocean governance.',
        'The "Space Diplomacy" addresses international cooperation in space.',
        'The "Arctic Diplomacy" addresses governance and cooperation in the Arctic.',
        'The "Antarctic Diplomacy" maintains the Antarctic Treaty System.',
        'The "Nuclear Diplomacy" addresses nuclear non-proliferation and disarmament.',
        'The "Disarmament Diplomacy" works toward reducing and eliminating weapons.',
        'The "Humanitarian Diplomacy" advocates for humanitarian access and protection.',
        'The "Migration Diplomacy" addresses international migration governance.',
        'The "Refugee Diplomacy" addresses refugee protection and solutions.',
        'The "Health Diplomacy" addresses global health governance.',
        'The "Vaccine Diplomacy" uses vaccine distribution as a foreign policy tool.',
        'The "Visa Diplomacy" uses visa policies as a diplomatic tool.',
        'The "Sanctions Diplomacy" uses economic sanctions as a diplomatic tool.',
        'The "Sports Diplomacy" uses sporting events for diplomatic engagement.',
        'The "Cultural Diplomacy" uses arts and culture for international engagement.',
        'The "Educational Diplomacy" uses educational exchanges for international understanding.',
        'The "Academic Diplomacy" uses academic cooperation for international engagement.',
        'The "Scientific Diplomacy" uses scientific collaboration for international cooperation.',
        'The "Technological Diplomacy" uses technology cooperation for international engagement.',
        'The "Digital Diplomacy" uses digital tools for diplomatic engagement.',
        'The "Data Diplomacy" uses data sharing for international cooperation.',
        'The "AI Diplomacy" addresses international governance of artificial intelligence.',
        'The "Cyber Diplomacy" addresses international cybersecurity cooperation.',
        'The "Quantum Diplomacy" addresses international cooperation on quantum technology.',
        'The "Biotech Diplomacy" addresses international governance of biotechnology.',
        'The "Space Diplomacy" addresses international cooperation in outer space.',
        'The "Ocean Diplomacy" addresses international ocean governance.',
        'The "Climate Diplomacy" addresses international climate change governance.',
        'The "Energy Diplomacy" addresses international energy governance.',
        'The "Food Diplomacy" addresses international food security governance.',
        'The "Water Diplomacy" addresses international water governance.',
        'The "Health Diplomacy" addresses international health governance.',
        'The "Trade Diplomacy" addresses international trade governance.',
        'The "Finance Diplomacy" addresses international financial governance.',
        'The "Development Diplomacy" addresses international development cooperation.',
        'The "Humanitarian Diplomacy" addresses international humanitarian action.',
        'The "Peace Diplomacy" addresses international peace and security.',
        'The "Disarmament Diplomacy" addresses international disarmament.',
        'The "Non-Proliferation Diplomacy" addresses preventing weapons proliferation.',
        'The "Counter-Terrorism Diplomacy" addresses international counter-terrorism cooperation.',
        'The "Counter-Narcotics Diplomacy" addresses international drug control.',
        'The "Anti-Corruption Diplomacy" addresses international anti-corruption efforts.',
        'The "Human Rights Diplomacy" addresses international human rights promotion.',
        'The "Gender Diplomacy" addresses international gender equality efforts.',
        'The "Indigenous Diplomacy" addresses international indigenous rights.',
        'The "Youth Diplomacy" engages young people in international affairs.',
        'The "Women in Diplomacy" promotes women\'s participation in international relations.',
        'The "Feminist Foreign Policy" prioritizes gender equality in foreign policy.',
        'The "Inclusive Diplomacy" ensures diverse voices in international processes.',
        'The "Parliamentary Diplomacy" involves legislators in international engagement.',
        'The "City Diplomacy" involves cities in international relations.',
        'The "Governor Diplomacy" involves sub-national governments in international engagement.',
        'The "Diaspora Diplomacy" engages diaspora communities for foreign policy goals.',
        'The "Faith Diplomacy" engages religious actors in peacebuilding.',
        'The "Indigenous Diplomacy" engages indigenous peoples in international forums.',
        'The "Civil Society Diplomacy" engages NGOs in international processes.',
        'The "Business Diplomacy" engages corporations in international relations.',
        'The "Corporate Diplomacy" manages a company\'s international stakeholder relationships.',
        'The "Investment Diplomacy" attracts foreign investment through diplomatic channels.',
        'The "Innovation Diplomacy" promotes international innovation cooperation.',
        'The "Startup Diplomacy" supports international startup ecosystems.',
        'The "Tech Diplomacy" engages technology companies in international policy.',
        'The "Platform Diplomacy" engages digital platforms in governance.',
        'The "Algorithmic Diplomacy" addresses international AI governance.',
        'The "Data Diplomacy" addresses international data governance.',
        'The "Privacy Diplomacy" addresses international privacy protection.',
        'The "Security Diplomacy" addresses international security cooperation.',
        'The "Defense Diplomacy" addresses international defense cooperation.',
        'The "Military Diplomacy" addresses international military cooperation.',
        'The "Naval Diplomacy" uses naval forces for diplomatic purposes.',
        'The "Gunboat Diplomacy" uses naval power to intimidate — now considered obsolete.',
        'The "Coercive Diplomacy" uses threats to change behavior.',
        'The "Preventive Diplomacy" takes action to prevent disputes from escalating.',
        'The "Corrective Diplomacy" addresses violations of international norms.',
        'The "Transformative Diplomacy" seeks to transform international relationships.',
        'The "Reconciliatory Diplomacy" seeks to heal past conflicts.',
        'The "Apology Diplomacy" uses official apologies to mend relationships.',
        'The "Commemorative Diplomacy" uses shared memory to build relationships.',
        'The "Heritage Diplomacy" uses cultural heritage for international engagement.',
        'The "Museum Diplomacy" uses museums for cultural exchange.',
        'The "Exhibition Diplomacy" uses international exhibitions for engagement.',
        'The "Gastronomy Diplomacy" (Culinary Diplomacy) uses food for cultural exchange.',
        'The "Fashion Diplomacy" uses fashion for cultural representation.',
        'The "Music Diplomacy" uses music for cultural exchange.',
        'The "Film Diplomacy" uses cinema for cultural diplomacy.',
        'The "Art Diplomacy" uses visual arts for international engagement.',
        'The "Literary Diplomacy" uses literature for cultural exchange.',
        'The "Translation Diplomacy" promotes translation of cultural works.',
        'The "Language Diplomacy" promotes language learning for international understanding.',
        'The "Education Diplomacy" uses educational exchange for international understanding.',
        'The "Exchange Diplomacy" uses people-to-people exchanges.',
        'The "Fellowship Diplomacy" uses professional exchanges for capacity building.',
        'The "Scholarship Diplomacy" uses scholarships for international engagement.',
        'The "Research Diplomacy" uses research collaboration for international cooperation.',
        'The "Think Tank Diplomacy" engages think tanks in international policy dialogue.',
        'The "Media Diplomacy" engages media in international relations.',
        'The "Broadcast Diplomacy" uses international broadcasting for public diplomacy.',
        'The "Podcast Diplomacy" uses podcasts for public engagement.',
        'The "Social Media Diplomacy" uses social media for diplomatic engagement.',
        'The "Hashtag Diplomacy" uses social media campaigns for diplomatic messaging.',
        'The "Memetic Diplomacy" uses internet memes for cultural exchange.',
        'The "Gaming Diplomacy" uses video games for international engagement.',
        'The "Esports Diplomacy" uses competitive gaming for international engagement.',
        'The "Virtual Diplomacy" uses virtual reality for diplomatic engagement.',
        'The "Metaverse Diplomacy" addresses governance of virtual worlds.',
        'The "AI Diplomacy" addresses international AI governance.',
        'The "Quantum Diplomacy" addresses international quantum technology governance.',
        'The "Blockchain Diplomacy" uses blockchain for international cooperation.',
        'The "Cryptocurrency Diplomacy" addresses international cryptocurrency governance.',
        'The "Central Bank Digital Currency (CBDC) Diplomacy" addresses digital currency governance.',
        'The "Fintech Diplomacy" addresses international financial technology governance.',
        'The "Green Finance Diplomacy" promotes sustainable finance internationally.',
        'The "Climate Finance Diplomacy" addresses climate funding commitments.',
        'The "Loss and Damage" addresses climate impacts beyond adaptation.',
        'The "Loss and Damage Fund" was established at COP28 to help vulnerable countries.',
        'The "Green Climate Fund (GCF)" supports climate projects in developing countries.',
        'The "Global Environment Facility (GEF)" funds environmental projects.',
        'The "Adaptation Fund" finances climate adaptation in developing countries.',
        'The "Technology Mechanism" promotes climate technology transfer.',
        'The "Warsaw International Mechanism" addresses loss and damage from climate change.',
        'The "Santiago Network" connects vulnerable countries with technical assistance.',
        'The "Early Warning for All" initiative aims to protect everyone with early warning systems by 2027.',
        'The "Race to Zero" campaign mobilizes net-zero commitments.',
        'The "Race to Resilience" campaign builds climate resilience.',
        'The "Net Zero" means balancing emissions produced and removed from the atmosphere.',
        'The "Carbon Neutral" means net-zero carbon dioxide emissions.',
        'The "Climate Neutral" means net-zero all greenhouse gas emissions.',
        'The "Nature Positive" means halting and reversing nature loss.',
        'The "Biodiversity Net Gain" ensures development leaves nature better than before.',
        'The "Nature-Based Solutions" use ecosystems to address climate and biodiversity challenges.',
        'The "Ecosystem-Based Adaptation" uses ecosystems to adapt to climate change.',
        'The "Community-Based Adaptation" involves local communities in climate adaptation.',
        'The "Adaptation" adjusts to actual or expected climate effects.',
        'The "Mitigation" reduces greenhouse gas emissions.',
        'The "Resilience" is the ability to recover from climate impacts.',
        'The "Adaptive Capacity" is the ability to adjust to climate change.',
        'The "Vulnerability" is the degree to which a system is susceptible to climate harm.',
        'The "Exposure" is the presence of people or assets in climate-affected areas.',
        'The "Sensitivity" is the degree to which a system is affected by climate stimuli.',
        'The "Risk" is the combination of hazard, exposure, and vulnerability.',
        'The "Hazard" is a potential climate event or trend.',
        'The "Climate Scenario" is a plausible future climate based on emissions pathways.',
        'The "Representative Concentration Pathways (RCPs)" are greenhouse gas concentration trajectories.',
        'The "Shared Socioeconomic Pathways (SSPs)" are scenarios of future societal development.',
        'The "Global Warming Potential (GWP)" measures how much heat a greenhouse gas traps.',
        'The "Carbon Footprint" measures total greenhouse gas emissions.',
        'The "Ecological Footprint" measures human demand on ecosystems.',
        'The "Water Footprint" measures total water use.',
        'The "Planetary Boundaries" define a safe operating space for humanity.',
        'The "Earth Overshoot Day" marks when humanity\'s demand exceeds Earth\'s annual resources.',
        'The "Doughnut Economics" model balances human needs with planetary boundaries.',
        'The "Circular Economy" eliminates waste through reuse and recycling.',
        'The "Blue Economy" promotes sustainable use of ocean resources.',
        'The "Green Economy" is low-carbon, resource-efficient, and socially inclusive.',
        'The "Purple Economy" integrates culture into economic development.',
        'The "Orange Economy" focuses on creative industries.',
        'The "Silver Economy" addresses the economic needs of aging populations.',
        'The "Care Economy" values unpaid care and domestic work.',
        'The "Sharing Economy" involves peer-to-peer access to goods and services.',
        'The "Gig Economy" involves short-term, flexible jobs.',
        'The "Platform Economy" is based on digital platforms connecting producers and consumers.',
        'The "Attention Economy" treats human attention as a scarce resource.',
        'The "Experience Economy" values memorable experiences over products.',
        'The "Knowledge Economy" is based on intellectual capital.',
        'The "Innovation Economy" is driven by innovation and technology.',
        'The "Creative Economy" is based on creative industries.',
        'The "Cultural Economy" values cultural production and heritage.',
        'The "Digital Economy" is based on digital technologies.',
        'The "Data Economy" treats data as an economic asset.',
        'The "Algorithm Economy" treats algorithms as economic assets.',
        'The "API Economy" treats application programming interfaces as products.',
        'The "App Economy" is based on mobile applications.',
        'The "Cloud Economy" is based on cloud computing services.',
        'The "Edge Economy" is based on edge computing.',
        'The "Quantum Economy" will be based on quantum computing.',
        'The "Space Economy" includes space-based products and services.',
        'The "Ocean Economy" includes ocean-based industries.',
        'The "Forest Economy" includes forest-based products and services.',
        'The "Bioeconomy" is based on biological resources.',
        'The "Hydrogen Economy" is based on hydrogen as an energy carrier.',
        'The "Electric Vehicle (EV) Economy" is based on electric transportation.',
        'The "Battery Economy" is based on battery storage technology.',
        'The "Solar Economy" is based on solar energy.',
        'The "Wind Economy" is based on wind energy.',
        'The "Nuclear Economy" is based on nuclear energy.',
        'The "Fusion Economy" will be based on nuclear fusion energy.',
        'The "Geothermal Economy" is based on geothermal energy.',
        'The "Tidal Economy" is based on tidal energy.',
        'The "Wave Economy" is based on wave energy.',
        'The "Biofuel Economy" is based on biofuels.',
        'The "Waste-to-Energy Economy" converts waste into energy.',
        'The "Carbon Capture Economy" is based on carbon capture technology.',
        'The "Direct Air Capture (DAC)" removes CO2 directly from the atmosphere.',
        'The "Carbon Capture and Storage (CCS)" captures and stores CO2 underground.',
        'The "Carbon Capture, Utilization and Storage (CCUS)" uses captured CO2.',
        'The "Enhanced Weathering" accelerates natural CO2 absorption by rocks.',
        'The "Ocean Fertilization" adds nutrients to oceans to increase CO2 absorption.',
        'The "Afforestation" plants forests to absorb CO2.',
        'The "Reforestation" replants forests that have been cut down.',
        'The "Forest Restoration" restores degraded forests.',
        'The "Mangrove Restoration" restores coastal mangrove forests.',
        'The "Peatland Restoration" restores peatland ecosystems.',
        'The "Wetland Restoration" restores wetland ecosystems.',
        'The "Coral Reef Restoration" restores damaged coral reefs.',
        'The "Seagrass Restoration" restores seagrass meadows.',
        'The "Soil Carbon Sequestration" stores carbon in agricultural soils.',
        'The "Biochar" is charcoal used as a soil amendment that stores carbon.',
        'The "Blue Carbon" is carbon stored in coastal and marine ecosystems.',
        'The "Green Carbon" is carbon stored in terrestrial ecosystems.',
        'The "Black Carbon" is soot from incomplete combustion that contributes to warming.',
        'The "Carbon Budget" is the maximum amount of CO2 that can be emitted to limit warming.',
        'The "Carbon Pricing" puts a price on carbon emissions.',
        'The "Carbon Tax" directly taxes carbon emissions.',
        'The "Cap and Trade" sets a limit on emissions and allows trading of permits.',
        'The "Carbon Offset" compensates for emissions by funding emission reductions elsewhere.',
        'The "Carbon Credit" represents one ton of CO2 reduced or removed.',
        'The "Voluntary Carbon Market" trades carbon credits voluntarily.',
        'The "Compliance Carbon Market" is mandated by regulation.',
        'The "Article 6" of the Paris Agreement governs international carbon markets.',
        'The "Internationally Transferred Mitigation Outcomes (ITMOs)" are carbon credits under Article 6.',
        'The "Corresponding Adjustments" prevent double-counting of emission reductions.',
        'The "Nationally Determined Contributions (NDCs)" are countries\' climate action plans.',
        'The "Long-Term Strategies (LTS)" are countries\' long-term climate plans.',
        'The "Global Stocktake" assesses collective progress toward Paris Agreement goals.',
        'The "Enhanced Transparency Framework (ETF)" requires countries to report climate progress.',
        'The "Biennial Transparency Reports (BTRs)" are countries\' climate progress reports.',
        'The "Technical Expert Review" assesses countries\' climate reports.',
        'The "Facilitative Multilateral Consideration" reviews countries\' climate progress.',
        'The "Compliance Committee" ensures countries meet their Paris Agreement commitments.',
        'The "Implementation and Compliance Committee" addresses non-compliance.',
        'The "Non-Party Stakeholders" include cities, businesses, and civil society in climate action.',
        'The "Global Climate Action Agenda" mobilizes non-party climate action.',
        'The "Marrakech Partnership" advances climate action by non-party stakeholders.',
        'The "Climate Ambition Alliance" brings together countries and non-state actors.',
        'The "High Ambition Coalition" pushes for stronger climate action.',
        'The "Cartagena Dialogue" advances climate action among progressive countries.',
        'The "Environmental Integrity Group" includes countries from different regions.',
        'The "Umbrella Group" includes non-EU developed countries.',
        'The "Like-Minded Developing Countries (LMDCs)" coordinate developing country positions.',
        'The "Alliance of Small Island States (AOSIS)" advocates for climate-vulnerable countries.',
        'The "Least Developed Countries (LDC) Group" coordinates LDC climate positions.',
        'The "Coalition for Rainforest Nations" advocates for forest protection.',
        'The "Climate Vulnerable Forum (CVF)" represents climate-vulnerable countries.',
        'The "V20" (Vulnerable Twenty) Group of Finance Ministers coordinates climate finance.',
        'The "G77 and China" is the largest intergovernmental group of developing countries.',
        'The "BASIC" group (Brazil, South Africa, India, China) coordinates climate positions.',
        'The "JUSSCANNZ" group (Japan, US, Switzerland, Canada, etc.) coordinates climate positions.',
        'The "Umbrella Group" includes Australia, Canada, Japan, New Zealand, Norway, Russia, Ukraine, US.',
        'The "Environmental Integrity Group" includes Mexico, South Korea, Switzerland.',
        'The "Arab Group" coordinates Arab country positions.',
        'The "African Group" coordinates African country positions.',
        'The "Asia-Pacific Group" coordinates Asia-Pacific country positions.',
        'The "Eastern European Group" coordinates Eastern European country positions.',
        'The "Latin American and Caribbean Group (GRULAC)" coordinates regional positions.',
        'The "Western European and Others Group (WEOG)" coordinates Western positions.',
        'The "EU" coordinates European Union member positions.',
        'The "Non-Aligned Movement (NAM)" coordinates non-aligned country positions.',
        'The "Organization of Islamic Cooperation (OIC)" coordinates Islamic country positions.',
        'The "Group of 77 (G77)" is the largest developing country coalition at the UN.',
        'The "Group of 24 (G24)" coordinates developing country positions on monetary issues.',
        'The "Group of 20 (G20)" is the main forum for international economic cooperation.',
        'The "Group of 7 (G7)" coordinates positions of major advanced economies.',
        'The "Group of 8 (G8)" was the G7 plus Russia (suspended in 2014).',
        'The "BRICS+" expanded BRICS to include Egypt, Ethiopia, Iran, Saudi Arabia, and UAE in 2024.',
        'The "MINT" (Mexico, Indonesia, Nigeria, Turkey) are emerging economies.',
        'The "CIVETS" (Colombia, Indonesia, Vietnam, Egypt, Turkey, South Africa) are emerging economies.',
        'The "Next Eleven (N-11)" are countries with potential to become major economies.',
        'The "Fragile Five" are emerging economies vulnerable to financial stress.',
        'The "Troubled Ten" are emerging economies with significant economic challenges.',
        'The "PIGS" (Portugal, Italy, Greece, Spain) were Eurozone debt crisis countries.',
        'The "Visegrad Four (V4)" are Czech Republic, Hungary, Poland, Slovakia.',
        'The "Bucharest Nine (B9)" are NATO\'s eastern flank countries.',
        'The "Three Seas Initiative" connects Baltic, Black, and Adriatic Sea regions.',
        'The "Intermarium" is a historical concept of Central European cooperation.',
        'The "Lublin Triangle" is a cooperation format of Poland, Lithuania, and Ukraine.',
        'The "Association Trio" is Georgia, Moldova, and Ukraine\'s EU integration format.',
        'The "GUAM" (Georgia, Ukraine, Azerbaijan, Moldova) is a regional cooperation format.',
        'The "Community of Democracies" promotes democratic governance.',
        'The "Alliance for Multilateralism" promotes international cooperation.',
        'The "Freedom Online Coalition" promotes internet freedom.',
        'The "Equal Rights Coalition" promotes LGBTQ+ rights.',
        'The "Global Partnership for Effective Development Cooperation (GPEDC)" promotes aid effectiveness.',
        'The "Open Government Partnership (OGP)" promotes transparent governance.',
        'The "Extractive Industries Transparency Initiative (EITI)" promotes resource transparency.',
        'The "Construction Sector Transparency Initiative (CoST)" promotes infrastructure transparency.',
        'The "International Aid Transparency Initiative (IATI)" makes aid data public.',
        'The "Global Fund" fights AIDS, tuberculosis, and malaria.',
        'The "GAVI Alliance" provides vaccines to developing countries.',
        'The "Global Partnership for Education (GPE)" supports education in developing countries.',
        'The "Global Agriculture and Food Security Program (GAFSP)" supports food security.',
        'The "Global Infrastructure Facility (GIF)" supports infrastructure investment.',
        'The "Global Innovation Fund (GIF)" supports social innovation.',
        'The "Global Environment Facility (GEF)" funds environmental projects.',
        'The "Green Climate Fund (GCF)" funds climate projects.',
        'The "Adaptation Fund" funds climate adaptation.',
        'The "Loss and Damage Fund" funds climate loss and damage.',
        'The "World Bank" provides loans and grants to developing countries.',
        'The "International Monetary Fund (IMF)" ensures global financial stability.',
        'The "Asian Infrastructure Investment Bank (AIIB)" funds Asian infrastructure.',
        'The "New Development Bank (NDB)" funds BRICS infrastructure.',
        'The "Asian Development Bank (ADB)" funds Asian development.',
        'The "African Development Bank (AfDB)" funds African development.',
        'The "Inter-American Development Bank (IDB)" funds Latin American development.',
        'The "European Bank for Reconstruction and Development (EBRD)" funds transition economies.',
        'The "Islamic Development Bank (IsDB)" funds Islamic member development.',
        'The "OPEC Fund for International Development (OFID)" funds developing countries.',
        'The "International Fund for Agricultural Development (IFAD)" funds rural development.',
        'The "World Food Programme (WFP)" provides food assistance.',
        'The "UN Children\'s Fund (UNICEF)" provides child assistance.',
        'The "UN Development Programme (UNDP)" supports sustainable development.',
        'The "UN Population Fund (UNFPA)" supports reproductive health.',
        'The "UN Women" supports gender equality.',
        'The "UN Refugee Agency (UNHCR)" protects refugees.',
        'The "UN Relief and Works Agency (UNRWA)" supports Palestinian refugees.',
        'The "International Organization for Migration (IOM)" supports migration management.',
        'The "International Committee of the Red Cross (ICRC)" provides humanitarian aid in conflict.',
        'The "International Federation of Red Cross and Red Crescent Societies (IFRC)" coordinates disaster response.',
        'The "Médecins Sans Frontières (MSF)" provides medical humanitarian aid.',
        'The "Oxfam" fights poverty and injustice.',
        'The "Save the Children" supports children\'s rights.',
        'The "World Wildlife Fund (WWF)" protects nature.',
        'The "Greenpeace" campaigns on environmental issues.',
        'The "Amnesty International" campaigns on human rights.',
        'The "Human Rights Watch (HRW)" investigates human rights abuses.',
        'The "Transparency International" fights corruption.',
        'The "Reporters Without Borders (RSF)" defends press freedom.',
        'The "International Crisis Group (ICG)" prevents and resolves conflict.',
        'The "Chatham House" is a leading international affairs think tank.',
        'The "Council on Foreign Relations (CFR)" is a US foreign policy think tank.',
        'The "International Institute for Strategic Studies (IISS)" researches security issues.',
        'The "Stockholm International Peace Research Institute (SIPRI)" researches peace and conflict.',
        'The "United Nations Institute for Disarmament Research (UNIDIR)" researches disarmament.',
        'The "United Nations University (UNU)" is a global think tank.',
        'The "World Economic Forum (WEF)" engages leaders on global issues.',
        'The "Munich Security Conference (MSC)" discusses international security.',
        'The "Shangri-La Dialogue" discusses Asia security issues.',
        'The "Halifax International Security Forum" discusses security issues.',
        'The "Raisina Dialogue" discusses global issues from an Indian perspective.',
        'The "Manama Dialogue" discusses Middle East security issues.',
        'The "Doha Forum" discusses global governance issues.',
        'The "World Government Summit" discusses government innovation.',
        'The "World Cities Summit" discusses urban challenges.',
        'The "World Water Forum" discusses water issues.',
        'The "World Health Summit" discusses global health.',
        'The "World Education Forum" discusses education.',
        'The "World Science Forum" discusses science policy.',
        'The "World Economic Forum Annual Meeting" in Davos discusses global issues.',
        'The "UN General Assembly High-Level Week" is the world\'s premier diplomatic event.',
        'The "UN Climate Change Conference (COP)" is the annual climate summit.',
        'The "UN Biodiversity Conference (COP)" addresses biodiversity.',
        'The "UN Convention to Combat Desertification (COP)" addresses desertification.',
        'The "UN Water Conference" addresses water issues.',
        'The "UN Ocean Conference" addresses ocean issues.',
        'The "UN Transport Conference" addresses sustainable transport.',
        'The "UN Habitat Conference" addresses urban issues.',
        'The "UN Social Summit" addresses social development.',
        'The "UN World Summit on the Information Society (WSIS)" addresses digital issues.',
        'The "UN Internet Governance Forum (IGF)" discusses internet policy.',
        'The "UN Forum on Forests" addresses forest policy.',
        'The "UN Permanent Forum on Indigenous Issues" addresses indigenous rights.',
        'The "UN Forum on Business and Human Rights" addresses business and human rights.',
        'The "UN Forum on Minority Issues" addresses minority rights.',
        'The "UN Forum on Climate Change" addresses climate issues.',
        'The "UN Forum on Sustainable Development" addresses sustainable development.',
        'The "UN Forum on Gender Equality" addresses gender issues.',
        'The "UN Forum on Youth" addresses youth issues.',
        'The "UN Forum on Ageing" addresses ageing issues.',
        'The "UN Forum on Disability" addresses disability issues.',
        'The "UN Forum on Migration" addresses migration issues.',
        'The "UN Forum on Refugees" addresses refugee issues.',
        'The "UN Forum on Peacebuilding" addresses peacebuilding.',
        'The "UN Forum on Disarmament" addresses disarmament.',
        'The "UN Forum on Non-Proliferation" addresses non-proliferation.',
        'The "UN Forum on Counter-Terrorism" addresses counter-terrorism.',
        'The "UN Forum on Human Rights" addresses human rights.',
        'The "UN Forum on Economic, Social and Cultural Rights" addresses ESC rights.',
        'The "UN Forum on Civil and Political Rights" addresses civil and political rights.',
        'The "UN Forum on the Rights of the Child" addresses children\'s rights.',
        'The "UN Forum on Women\'s Rights" addresses women\'s rights.',
        'The "UN Forum on Indigenous Rights" addresses indigenous rights.',
        'The "UN Forum on Minority Rights" addresses minority rights.',
        'The "UN Forum on Migrant Rights" addresses migrant rights.',
        'The "UN Forum on Refugee Rights" addresses refugee rights.',
        'The "UN Forum on Disability Rights" addresses disability rights.',
        'The "UN Forum on LGBTQ+ Rights" addresses LGBTQ+ rights.',
        'The "UN Forum on Environmental Rights" addresses environmental rights.',
        'The "UN Forum on Climate Rights" addresses climate justice.',
        'The "UN Forum on Digital Rights" addresses digital rights.',
        'The "UN Forum on Privacy Rights" addresses privacy rights.',
        'The "UN Forum on Data Rights" addresses data rights.',
        'The "UN Forum on AI Rights" addresses AI and human rights.',
        'The "UN Forum on Future Generations" addresses intergenerational justice.',
        'The "UN Forum on Global Governance" addresses global governance reform.',
        'The "UN Forum on UN Reform" addresses UN system reform.',
        'The "UN Forum on Security Council Reform" addresses UNSC reform.',
        'The "UN Forum on Financing for Development" addresses development finance.',
        'The "UN Forum on Tax Cooperation" addresses international tax issues.',
        'The "UN Forum on Debt Sustainability" addresses debt issues.',
        'The "UN Forum on Trade and Development" addresses trade issues.',
        'The "UN Forum on Technology Transfer" addresses technology access.',
        'The "UN Forum on Science and Technology for Development" addresses STI for development.',
        'The "UN Forum on Innovation for Development" addresses innovation.',
        'The "UN Forum on Digital Cooperation" addresses digital governance.',
        'The "UN Forum on Data for Development" addresses data for development.',
        'The "UN Forum on AI for Good" addresses AI for sustainable development.',
        'The "UN Forum on Space for Development" addresses space for development.',
        'The "UN Forum on Oceans for Development" addresses oceans for development.',
        'The "UN Forum on Forests for Development" addresses forests for development.',
        'The "UN Forum on Agriculture for Development" addresses agriculture for development.',
        'The "UN Forum on Energy for Development" addresses energy for development.',
        'The "UN Forum on Water for Development" addresses water for development.',
        'The "UN Forum on Health for Development" addresses health for development.',
        'The "UN Forum on Education for Development" addresses education for development.',
        'The "UN Forum on Gender for Development" addresses gender for development.',
        'The "UN Forum on Youth for Development" addresses youth for development.',
        'The "UN Forum on Culture for Development" addresses culture for development.',
        'The "UN Forum on Sports for Development" addresses sports for development.',
        'The "UN Forum on Tourism for Development" addresses tourism for development.',
        'The "UN Forum on Infrastructure for Development" addresses infrastructure.',
        'The "UN Forum on Transport for Development" addresses transport.',
        'The "UN Forum on Housing for Development" addresses housing.',
        'The "UN Forum on Social Protection" addresses social protection.',
        'The "UN Forum on Universal Health Coverage" addresses health coverage.',
        'The "UN Forum on Universal Education" addresses universal education.',
        'The "UN Forum on Universal Social Protection" addresses social protection floors.',
        'The "UN Forum on Universal Basic Income" addresses basic income.',
        'The "UN Forum on Universal Basic Services" addresses basic services.',
        'The "UN Forum on Universal Access to Justice" addresses access to justice.',
        'The "UN Forum on Universal Access to Information" addresses access to information.',
        'The "UN Forum on Universal Access to Technology" addresses technology access.',
        'The "UN Forum on Universal Access to Energy" addresses energy access.',
        'The "UN Forum on Universal Access to Water" addresses water access.',
        'The "UN Forum on Universal Access to Sanitation" addresses sanitation access.',
        'The "UN Forum on Universal Access to Health" addresses health access.',
        'The "UN Forum on Universal Access to Education" addresses education access.',
        'The "UN Forum on Universal Access to Food" addresses food access.',
        'The "UN Forum on Universal Access to Housing" addresses housing access.',
        'The "UN Forum on Universal Access to Social Protection" addresses social protection access.',
        'The "UN Forum on Universal Access to Justice" addresses justice access.',
        'The "UN Forum on Universal Access to Information" addresses information access.',
        'The "UN Forum on Universal Access to Participation" addresses participation access.',
        'The "UN Forum on Universal Access to Culture" addresses cultural access.',
        'The "UN Forum on Universal Access to Sports" addresses sports access.',
        'The "UN Forum on Universal Access to Recreation" addresses recreation access.',
        'The "UN Forum on Universal Access to Leisure" addresses leisure access.',
        'The "UN Forum on Universal Access to Rest" addresses rest access.',
        'The "UN Forum on Universal Access to Life" addresses the right to life.',
        'The "UN Forum on Universal Access to Liberty" addresses the right to liberty.',
        'The "UN Forum on Universal Access to Security" addresses the right to security.',
        'The "UN Forum on Universal Access to Privacy" addresses the right to privacy.',
        'The "UN Forum on Universal Access to Expression" addresses freedom of expression.',
        'The "UN Forum on Universal Access to Assembly" addresses freedom of assembly.',
        'The "UN Forum on Universal Access to Association" addresses freedom of association.',
        'The "UN Forum on Universal Access to Religion" addresses freedom of religion.',
        'The "UN Forum on Universal Access to Movement" addresses freedom of movement.',
        'The "UN Forum on Universal Access to Work" addresses the right to work.',
        'The "UN Forum on Universal Access to Rest" addresses the right to rest.',
        'The "UN Forum on Universal Access to Social Security" addresses social security.',
        'The "UN Forum on Universal Access to Family" addresses family rights.',
        'The "UN Forum on Universal Access to Marriage" addresses marriage rights.',
        'The "UN Forum on Universal Access to Property" addresses property rights.',
        'The "UN Forum on Universal Access to Political Participation" addresses political rights.',
        'The "UN Forum on Universal Access to Vote" addresses voting rights.',
        'The "UN Forum on Universal Access to Public Service" addresses public service access.',
        'The "UN Forum on Universal Access to Development" addresses the right to development.',
        'The "UN Forum on Universal Access to Peace" addresses the right to peace.',
        'The "UN Forum on Universal Access to Environment" addresses environmental rights.',
        'The "UN Forum on Universal Access to Humanitarian Assistance" addresses humanitarian access.',
        'The "UN Forum on Universal Access to Consular Protection" addresses consular access.',
        'The "UN Forum on Universal Access to Diplomatic Protection" addresses diplomatic protection.',
        'The "UN Forum on Universal Access to International Justice" addresses international justice.',
        'The "UN Forum on Universal Access to Truth" addresses the right to truth.',
        'The "UN Forum on Universal Access to Reparations" addresses the right to reparations.',
        'The "UN Forum on Universal Access to Memory" addresses the right to memory.',
        'The "UN Forum on Universal Access to Identity" addresses the right to identity.',
        'The "UN Forum on Universal Access to Nationality" addresses the right to nationality.',
        'The "UN Forum on Universal Access to Asylum" addresses the right to asylum.',
        'The "UN Forum on Universal Access to Citizenship" addresses citizenship rights.',
        'The "UN Forum on Universal Access to Dignity" addresses the right to dignity.',
        'The "UN Forum on Universal Access to Life with Dignity" addresses dignified life.',
        'The "UN Forum on Universal Access to a Decent Standard of Living" addresses decent living.',
        'The "UN Forum on Universal Access to Happiness" addresses the pursuit of happiness.',
        'The "UN Forum on Universal Access to Well-being" addresses well-being.',
        'The "UN Forum on Universal Access to Flourishing" addresses human flourishing.',
        'The "UN Forum on Universal Access to Fulfillment" addresses human fulfillment.',
        'The "UN Forum on Universal Access to Potential" addresses human potential.',
        'The "UN Forum on Universal Access to Opportunity" addresses equal opportunity.',
        'The "UN Forum on Universal Access to Hope" addresses hope for the future.',
        'The "UN Forum on Universal Access to a Better Future" addresses a better future for all.',
    ];

    let munFactIndexes = [];
    let munFactCurrent = -1;

    function shuffleFacts() {
        munFactIndexes = Array.from({ length: munFacts.length }, (_, i) => i);
        for (let i = munFactIndexes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [munFactIndexes[i], munFactIndexes[j]] = [munFactIndexes[j], munFactIndexes[i]];
        }
        munFactCurrent = 0;
    }

    function getNextFact() {
        if (munFactCurrent < 0 || munFactCurrent >= munFactIndexes.length) shuffleFacts();
        const fact = munFacts[munFactIndexes[munFactCurrent]];
        munFactCurrent++;
        if (munFactCurrent >= munFactIndexes.length) shuffleFacts();
        return fact;
    }

    function showMunFact() {
        const overlay = document.getElementById('munFactOverlay');
        const body = document.getElementById('munFactBody');
        body.innerHTML = `<div class="mun-fact-text">${getNextFact()}</div>`;
        overlay.style.display = 'flex';
    }

    function hideMunFact() {
        const overlay = document.getElementById('munFactOverlay');
        overlay.style.display = 'none';
    }

    // ═══════════════════════════════════════════════════════════════
    //  SPEECH TIMER WIDGET
    // ═══════════════════════════════════════════════════════════════

    let timerState = {
        totalSeconds: 0,
        remainingSeconds: 0,
        isRunning: false,
        isPaused: false,
        interval: null,
        presetSeconds: 0,
    };

    const TIMER_RING_CIRCUMFERENCE = 439.8;

    function updateTimerDisplay() {
        const display = document.getElementById('timerDisplay');
        const ring = document.getElementById('timerRingProgress');
        const status = document.getElementById('timerStatus');

        const mins = Math.floor(timerState.remainingSeconds / 60);
        const secs = timerState.remainingSeconds % 60;
        display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        // Progress ring
        const progress = timerState.totalSeconds > 0
            ? timerState.remainingSeconds / timerState.totalSeconds
            : 0;
        const offset = TIMER_RING_CIRCUMFERENCE * (1 - progress);
        ring.setAttribute('stroke-dashoffset', offset);

        // Color logic
        const ratio = timerState.totalSeconds > 0 ? timerState.remainingSeconds / timerState.totalSeconds : 0;
        if (timerState.remainingSeconds <= 0) {
            ring.setAttribute('stroke', '#ef4444');
            status.textContent = '⏰ Time Up!';
            status.className = 'timer-status time-up';
        } else if (timerState.remainingSeconds <= 10) {
            ring.setAttribute('stroke', '#f97316');
            status.textContent = '⚠️ Under 10 seconds!';
            status.className = 'timer-status';
        } else if (timerState.remainingSeconds <= 30) {
            ring.setAttribute('stroke', '#eab308');
            status.textContent = '⚡ Under 30 seconds';
            status.className = 'timer-status';
        } else {
            ring.setAttribute('stroke', '#22c55e');
            status.textContent = timerState.isPaused ? '⏸ Paused' : '🔴 Speaking';
            status.className = 'timer-status';
        }
    }

    function timerTick() {
        if (timerState.remainingSeconds > 0) {
            timerState.remainingSeconds--;
            updateTimerDisplay();
            if (timerState.remainingSeconds === 0) {
                clearInterval(timerState.interval);
                timerState.interval = null;
                timerState.isRunning = false;
                playTimerSound();
                updateTimerDisplay();
                showTimerControls();
            }
        }
    }

    function playTimerSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
            osc.frequency.setValueAtTime(440, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.6);
        } catch (e) { /* audio not available */ }
    }

    function showTimerControls() {
        document.getElementById('timerStartBtn').style.display = '';
        document.getElementById('timerPauseBtn').style.display = 'none';
        document.getElementById('timerResumeBtn').style.display = 'none';
        document.getElementById('timerResetBtn').style.display = '';
    }

    function hideTimerControls() {
        document.getElementById('timerStartBtn').style.display = 'none';
        document.getElementById('timerPauseBtn').style.display = '';
        document.getElementById('timerResumeBtn').style.display = 'none';
        document.getElementById('timerResetBtn').style.display = '';
    }

    function startTimer() {
        if (timerState.remainingSeconds <= 0) return;
        if (timerState.interval) clearInterval(timerState.interval);
        timerState.isRunning = true;
        timerState.isPaused = false;
        timerState.interval = setInterval(timerTick, 1000);
        hideTimerControls();
        document.getElementById('timerPauseBtn').style.display = '';
        updateTimerDisplay();
    }

    function pauseTimer() {
        if (timerState.interval) {
            clearInterval(timerState.interval);
            timerState.interval = null;
        }
        timerState.isRunning = false;
        timerState.isPaused = true;
        document.getElementById('timerPauseBtn').style.display = 'none';
        document.getElementById('timerResumeBtn').style.display = '';
        document.getElementById('timerResetBtn').style.display = '';
        updateTimerDisplay();
    }

    function resumeTimer() {
        timerState.isPaused = false;
        timerState.isRunning = true;
        timerState.interval = setInterval(timerTick, 1000);
        document.getElementById('timerResumeBtn').style.display = 'none';
        document.getElementById('timerPauseBtn').style.display = '';
        updateTimerDisplay();
    }

    function resetTimer() {
        if (timerState.interval) {
            clearInterval(timerState.interval);
            timerState.interval = null;
        }
        timerState.isRunning = false;
        timerState.isPaused = false;
        timerState.remainingSeconds = timerState.presetSeconds;
        timerState.totalSeconds = timerState.presetSeconds;
        showTimerControls();
        updateTimerDisplay();
    }

    function setTimerPreset(seconds) {
        if (timerState.interval) {
            clearInterval(timerState.interval);
            timerState.interval = null;
        }
        timerState.isRunning = false;
        timerState.isPaused = false;
        timerState.presetSeconds = seconds;
        timerState.remainingSeconds = seconds;
        timerState.totalSeconds = seconds;
        showTimerControls();
        updateTimerDisplay();

        // Highlight active preset
        document.querySelectorAll('.timer-preset-btn').forEach(b => b.classList.remove('active'));
        if (seconds > 0) {
            document.querySelectorAll('.timer-preset-btn').forEach(b => {
                if (parseInt(b.dataset.seconds) === seconds) b.classList.add('active');
            });
        }
        document.getElementById('timerCustomInput').style.display = 'none';
    }

    function showSpeechTimer() {
        const overlay = document.getElementById('speechTimerOverlay');
        overlay.style.display = 'flex';
        updateTimerDisplay();
    }

    function hideSpeechTimer() {
        const overlay = document.getElementById('speechTimerOverlay');
        overlay.style.display = 'none';
    }

    // ─── Widget Event Listeners ───────────────────────────────────

    function setupWidgetListeners() {
        // MUN Fact
        document.getElementById('munFactBtn').addEventListener('click', showMunFact);
        document.getElementById('munFactClose').addEventListener('click', hideMunFact);
        document.getElementById('munFactNext').addEventListener('click', () => {
            document.getElementById('munFactBody').innerHTML = `<div class="mun-fact-text">${getNextFact()}</div>`;
        });
        document.getElementById('munFactOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) hideMunFact();
        });

        // Speech Timer
        document.getElementById('speechTimerBtn').addEventListener('click', showSpeechTimer);
        document.getElementById('speechTimerClose').addEventListener('click', hideSpeechTimer);
        document.getElementById('speechTimerOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) hideSpeechTimer();
        });

        // Preset buttons
        document.querySelectorAll('.timer-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const secs = parseInt(btn.dataset.seconds);
                if (secs === 0) {
                    document.getElementById('timerCustomInput').style.display = 'flex';
                    document.querySelectorAll('.timer-preset-btn').forEach(b => b.classList.remove('active'));
                } else {
                    setTimerPreset(secs);
                }
            });
        });

        // Custom timer
        document.getElementById('timerCustomSet').addEventListener('click', () => {
            const mins = parseInt(document.getElementById('timerCustomMinutes').value) || 0;
            const secs = parseInt(document.getElementById('timerCustomSeconds').value) || 0;
            const total = mins * 60 + secs;
            if (total > 0) setTimerPreset(total);
        });

        // Timer controls
        document.getElementById('timerStartBtn').addEventListener('click', startTimer);
        document.getElementById('timerPauseBtn').addEventListener('click', pauseTimer);
        document.getElementById('timerResumeBtn').addEventListener('click', resumeTimer);
        document.getElementById('timerResetBtn').addEventListener('click', resetTimer);

        // Global Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const factOverlay = document.getElementById('munFactOverlay');
                const timerOverlay = document.getElementById('speechTimerOverlay');
                if (factOverlay.style.display === 'flex') hideMunFact();
                if (timerOverlay.style.display === 'flex') hideSpeechTimer();
            }
        });
    }

    // Initialize widgets after DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            shuffleFacts();
            setupWidgetListeners();
        });
    } else {
        shuffleFacts();
        setupWidgetListeners();
    }

})();
