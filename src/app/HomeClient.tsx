'use client';

import React from 'react';
import { MunFile } from '@/lib/types';
import { AppProvider, useApp } from '@/lib/AppContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import FileViewer from '@/components/FileViewer';
import CountryCard from '@/components/CountryCard';
import RelatedContent from '@/components/RelatedContent';
import RevisionView from '@/components/RevisionView';
import RightPanel from '@/components/RightPanel';
import Scratchpad from '@/components/Scratchpad';
import SpeechTimer from '@/components/SpeechTimer';
import MunFact from '@/components/MunFact';
import MyCountrySelector from '@/components/MyCountrySelector';
import SearchResults from '@/components/SearchResults';
import LoginOverlay from '@/components/LoginOverlay';
import { useSwipeGesture } from '@/lib/use-swipe';

export default function HomeClient({ initialFiles }: { initialFiles: MunFile[] }) {
  return (
    <AppProvider initialFiles={initialFiles}>
      <LoginOverlay />
      <AppShell />
    </AppProvider>
  );
}

function AppShell() {
  const { currentFile, revisionMode, searchQuery, sidebarVisible, toggleSidebar, rightPanelVisible, toggleRightPanel } = useApp();

  // Edge swipe gestures for mobile
  useSwipeGesture({
    onSwipeRightEdge: () => { if (!sidebarVisible) toggleSidebar(); },
    onSwipeLeftEdge: () => { if (!rightPanelVisible) toggleRightPanel(); },
    onSwipeLeft: () => { if (rightPanelVisible) toggleRightPanel(); },
    onSwipeRight: () => { if (sidebarVisible) toggleSidebar(); },
  });

  return (
    <>
      <Header />
      <div className="container">
        <Sidebar />
        <main className="main-content">
          <div className="content-header">
            <h2 id="fileTitle">
              {searchQuery ? 'Search Results' : currentFile?.displayName || 'MUN Research Hub'}
            </h2>
            {currentFile && (
              <span className="file-path">{currentFile.path}</span>
            )}
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
              <>
                <Dashboard />
                <Scratchpad />
              </>
            )}
          </div>
        </main>
        <RightPanel />
      </div>
      <SpeechTimer />
      <MunFact />
      <MyCountrySelector />
    </>
  );
}
