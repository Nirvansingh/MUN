'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { MunFile } from '@/lib/types';
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
import { useSwipeGesture } from '@/lib/use-swipe';

const Widgets = dynamic(() => import('@/components/Widgets'), { ssr: false, loading: () => null });

export default function SearchClient({ fileCount, initialFiles }: { fileCount: number; initialFiles: MunFile[] }) {
  return (
    <AppProvider initialFiles={initialFiles}>
      <LoginOverlay />
      <Inner fileCount={fileCount} />
    </AppProvider>
  );
}

function Inner({ fileCount }: { fileCount: number }) {
  const { searchQuery, currentFile, revisionMode, sidebarVisible, toggleSidebar, rightPanelVisible, toggleRightPanel } = useApp();

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
            <h2 id="fileTitle">Search {fileCount} files</h2>
          </div>
          <div className="content-body">
            {searchQuery ? (
              <SearchResults />
            ) : currentFile ? (
              <>
                {currentFile.isCountry && <CountryCard file={currentFile} />}
                {revisionMode ? (
                  <RevisionView file={currentFile} />
                ) : (
                  <FileViewer file={currentFile} />
                )}
                <RelatedContent filePath={currentFile.path} />
                <Scratchpad />
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '18px', marginBottom: '12px' }}>🔍</p>
                <p>Use the search bar above to search across {fileCount} research files.</p>
                <p style={{ fontSize: '13px', marginTop: '8px' }}>Press Ctrl+K to focus the search.</p>
              </div>
            )}
          </div>
        </main>
        <RightPanel />
      </div>
      <Widgets />
    </>
  );
}
