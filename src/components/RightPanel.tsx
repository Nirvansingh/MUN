'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/lib/AppContext';
import { extractOutline, readingTime, getFileIcon } from '@/lib/countries';

export default function RightPanel() {
  const { currentFile, rightPanelVisible, navigateTo, isPinned, togglePin, recentFiles, fileMap, toggleRightPanel } = useApp();

  const outline = useMemo(() => {
    if (!currentFile) return [];
    return extractOutline(currentFile.content);
  }, [currentFile]);

  return (
    <>
      {/* Backdrop overlay for mobile */}
      <div
        className={`mobile-overlay right-overlay ${rightPanelVisible ? 'active' : ''}`}
        onClick={toggleRightPanel}
      />
      <aside className={`right-panel ${rightPanelVisible ? 'open' : ''}`} id="rightPanel">
        <div className="right-panel-content">
          {!currentFile ? (
          <div className="right-panel-placeholder">
            <span className="right-panel-icon">📋</span>
            <span>Select a file to see details</span>
          </div>
        ) : (
          <>
            {/* Quick Facts */}
            <div className="right-panel-section">
              <div className="right-panel-section-title">📊 Quick Facts</div>
              <div className="right-panel-item">
                <span className="rpi-icon">📁</span>
                <span className="rpi-text">{currentFile.committee}</span>
              </div>
              <div className="right-panel-item">
                <span className="rpi-icon">📂</span>
                <span className="rpi-text">{currentFile.category}</span>
              </div>
              <div className="right-panel-item">
                <span className="rpi-icon">⏱️</span>
                <span className="rpi-text">{readingTime(currentFile.content)}</span>
              </div>
              <div className="right-panel-item" style={{ cursor: 'pointer' }}
                onClick={() => togglePin(currentFile.path)}>
                <span className="rpi-icon">📌</span>
                <span className="rpi-text">{isPinned(currentFile.path) ? 'Pinned' : 'Click to pin'}</span>
              </div>
            </div>

            {/* Outline */}
            {outline.length > 0 && (
              <div className="right-panel-section">
                <div className="right-panel-section-title">📑 Outline</div>
                {outline.map((item, idx) => (
                  <div key={idx} className={`right-panel-outline-item level-${item.level}`}>
                    {item.text}
                  </div>
                ))}
              </div>
            )}

            {/* Recent Files */}
            {recentFiles.length > 1 && (
              <div className="right-panel-section">
                <div className="right-panel-section-title">🕐 Recent</div>
                {recentFiles.slice(0, 5).map(p => {
                  const f = fileMap.get(p);
                  if (!f || f.path === currentFile.path) return null;
                  return (
                    <div key={p} className="right-panel-item" data-path={f.path}
                      onClick={() => navigateTo(f.path)}>
                      <span className="rpi-icon">{getFileIcon(f.name, f)}</span>
                      <span className="rpi-text">{f.displayName}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
    </>
  );
}
