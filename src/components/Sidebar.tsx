'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/lib/AppContext';
import { getFolderIcon, getFolderColorClass, getFileIcon } from '@/lib/countries';
import { MunFile } from '@/lib/types';

function buildTree(files: MunFile[], selectedCommittee: string, searchQuery: string) {
  const filtered = files.filter(f => {
    const matchesCommittee = selectedCommittee === 'all' || f.committee === selectedCommittee || f.committee === 'General Guide';
    return matchesCommittee;
  });

  const treeFiles = searchQuery
    ? filtered.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : filtered;

  const treeObj: Record<string, any> = {};
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
  return treeObj;
}

function TreeNode({
  obj,
  parentPath,
  currentFilePath,
  onFileClick,
}: {
  obj: Record<string, any>;
  parentPath: string;
  currentFilePath: string | null;
  onFileClick: (path: string) => void;
}) {
  const { getFolderState, toggleFolderState } = useApp();

  const folders = Object.keys(obj).filter(k => k !== '_files').sort();

  return (
    <>
      {folders.map(folderName => {
        const fullPath = parentPath ? parentPath + '/' + folderName : folderName;
        const isOpen = getFolderState(fullPath);
        const folderBadge = getFolderIcon(folderName);
        const colorClass = getFolderColorClass(folderName);

        return (
          <div key={fullPath} className={`tree-folder ${isOpen ? 'open' : ''}`}>
            <div
              className="folder-header"
              onClick={() => toggleFolderState(fullPath)}
            >
              <span className="folder-icon">▸</span>
              {colorClass && <span className={`folder-color-dot ${colorClass}`}></span>}
              <span>{folderBadge} {folderName}</span>
            </div>
            <div className="folder-children">
              <TreeNode
                obj={obj[folderName]}
                parentPath={fullPath}
                currentFilePath={currentFilePath}
                onFileClick={onFileClick}
              />
            </div>
          </div>
        );
      })}
      {obj._files?.map((file: MunFile) => {
        const isActive = currentFilePath === file.path;
        const icon = getFileIcon(file.name, file);
        const displayText = file.isCountry
          ? file.displayName.replace(/^.*?\s/, '')
          : file.displayName;
        return (
          <div
            key={file.path}
            className={`tree-file ${isActive ? 'active' : ''}`}
            onClick={() => onFileClick(file.path)}
          >
            <span>{icon}</span>
            <span>{displayText}</span>
          </div>
        );
      })}
    </>
  );
}

export default function Sidebar() {
  const { files, selectedCommittee, searchQuery, currentFile, navigateTo, sidebarVisible, toggleSidebar } = useApp();
  const treeObj = useMemo(
    () => buildTree(files, selectedCommittee, searchQuery),
    [files, selectedCommittee, searchQuery]
  );

  // Close sidebar on file click on mobile
  const handleFileClick = (path: string) => {
    navigateTo(path);
    // On mobile, close sidebar after selecting a file
    if (window.innerWidth <= 768) {
      // We'll let the CSS handle visibility via sidebarVisible toggle
    }
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      <div
        className={`mobile-overlay ${sidebarVisible ? 'active' : ''}`}
        onClick={toggleSidebar}
      />
      <aside className={`sidebar ${sidebarVisible ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-title">📁 File Explorer</div>
        <div className="file-tree">
          <TreeNode
            obj={treeObj}
            parentPath=""
            currentFilePath={currentFile?.path ?? null}
            onFileClick={handleFileClick}
          />
        </div>
      </aside>
    </>
  );
}
