'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AppProvider, useApp } from '@/lib/AppContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import RightPanel from '@/components/RightPanel';
import FileViewer from '@/components/FileViewer';
import CountryCard from '@/components/CountryCard';
import RelatedContent from '@/components/RelatedContent';
import RevisionView from '@/components/RevisionView';
import Scratchpad from '@/components/Scratchpad';
import SearchResults from '@/components/SearchResults';
import LoginOverlay from '@/components/LoginOverlay';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import { MunFile } from '@/lib/types';
import { useSwipeGesture } from '@/lib/use-swipe';

const Widgets = dynamic(() => import('@/components/Widgets'), { ssr: false, loading: () => null });

export default function GlobalClient({ fileData, initialFiles }: { fileData: MunFile; initialFiles: MunFile[] }) {
  return (
    <AppProvider initialFiles={initialFiles}>
      <LoginOverlay />
      <Inner fileData={fileData} />
    </AppProvider>
  );
}

function Inner({ fileData }: { fileData: MunFile }) {
  const { currentFile, setCurrentFile, searchQuery, revisionMode, sidebarVisible, toggleSidebar, rightPanelVisible, toggleRightPanel } = useApp();

  // On the global route the page itself IS the current file. Seed the context
  // once (after mount) so revision mode, history, and RelatedContent work on
  // first load too. Rendered via `activeFile` fallback, so no visual change.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!seeded && currentFile === null) {
      setSeeded(true);
      setCurrentFile(fileData);
    }
  }, [seeded, currentFile, fileData, setCurrentFile]);
  const activeFile = currentFile || fileData;

  useSwipeGesture({
    onSwipeRightEdge: () => { if (!sidebarVisible) toggleSidebar(); },
    onSwipeLeftEdge: () => { if (!rightPanelVisible) toggleRightPanel(); },
    onSwipeLeft: () => { if (rightPanelVisible) toggleRightPanel(); },
    onSwipeRight: () => { if (sidebarVisible) toggleSidebar(); },
  });

  return (
    <>
      <Header />
      <KeyboardShortcuts />
      <div className="container">
        <Sidebar />
        <main className="main-content">
          <div className="content-header">
            <h2 id="fileTitle">
              {searchQuery ? 'Search Results' : activeFile.displayName}
            </h2>
            {currentFile && <span className="file-path">{currentFile.path}</span>}
          </div>
          <div className="content-body">
            {searchQuery ? (
              <SearchResults />
            ) : (
              <>
                {activeFile.isCountry && <CountryCard file={activeFile} />}
                {revisionMode ? (
                  <RevisionView file={activeFile} />
                ) : (
                  <FileViewer file={activeFile} />
                )}
                {currentFile && <RelatedContent filePath={currentFile.path} />}
                <Scratchpad />
              </>
            )}
          </div>
        </main>
        <RightPanel />
      </div>
      <Widgets />
    </>
  );
}
