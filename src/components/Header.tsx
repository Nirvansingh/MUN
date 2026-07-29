'use client';

import React, { useRef, useEffect } from 'react';
import { useApp } from '@/lib/AppContext';
import { getCountryFlag } from '@/lib/countries';

export default function Header() {
  const {
    selectedCommittee, setSelectedCommittee, searchQuery, setSearchQuery,
    theme, toggleTheme, myCountry,
    toggleSidebar, rightPanelVisible, toggleRightPanel,
    navigateBack, navigateForward, canGoBack, canGoForward,
    setCurrentFile, files, setRevisionMode, revisionMode, currentFile,
  } = useApp();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBrandClick = () => {
    setCurrentFile(null);
    setRevisionMode(false);
    setSearchQuery('');
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
          ☰
        </button>
        <button className="nav-btn" onClick={navigateBack} disabled={!canGoBack} title="Back (Alt+←)">
          ◀
        </button>
        <button className="nav-btn" onClick={navigateForward} disabled={!canGoForward} title="Forward (Alt+→)">
          ▶
        </button>
        <div className="brand" onClick={handleBrandClick} style={{ cursor: 'pointer' }}>
          <div className="brand-badge">🌐</div>
          <h1>MUN Research Hub</h1>
        </div>
      </div>

      <div className="header-controls">
        <select
          className="select-input"
          value={selectedCommittee}
          onChange={(e) => setSelectedCommittee(e.target.value)}
          title="Filter by Committee"
        >
          <option value="all">🌐 All Committees</option>
          <option value="UNHRC">🕊️ UNHRC Mode</option>
          <option value="UNSC">⚓ UNSC Mode</option>
        </select>

        <button id="myCountryBtn" className="btn" title="Select your country"
          onClick={() => window.dispatchEvent(new CustomEvent('open-my-country'))}>
          {myCountry ? `${getCountryFlag(myCountry.name + '.txt') || '🎯'} ${myCountry.name}` : '🎯 My Country'}
        </button>

        <button className="btn scratchpad-toggle-btn" title="Open Scratchpad"
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-scratchpad'))}>
          📝
        </button>

        <input
          ref={searchRef}
          type="text"
          className="search-input"
          placeholder="🔍 Search files & content (Ctrl+K)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />

        <button className="btn" onClick={toggleTheme}>
          {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>

        <button className="btn" title="Quick Revision Mode"
          onClick={() => {
            if (currentFile) setRevisionMode(!revisionMode);
          }}>
          {revisionMode ? '📄 Full View' : '📋 Revise'}
        </button>

        <button className="btn" title="Toggle right panel" onClick={toggleRightPanel}>
          {rightPanelVisible ? '📋 Panel' : '📋'}
        </button>
      </div>
    </header>
  );
}
