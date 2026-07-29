'use client';

import React from 'react';
import { MunFile } from '@/lib/types';
import { AppProvider, useApp } from '@/lib/AppContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import RightPanel from '@/components/RightPanel';
import SpeechTimer from '@/components/SpeechTimer';
import MunFact from '@/components/MunFact';
import MyCountrySelector from '@/components/MyCountrySelector';
import FileViewer from '@/components/FileViewer';
import CountryCard from '@/components/CountryCard';
import RelatedContent from '@/components/RelatedContent';
import Scratchpad from '@/components/Scratchpad';
import SearchResults from '@/components/SearchResults';

export default function SearchClient({ fileCount, initialFiles }: { fileCount: number; initialFiles: MunFile[] }) {
  return (
    <AppProvider initialFiles={initialFiles}>
      <Inner fileCount={fileCount} />
    </AppProvider>
  );
}

function Inner({ fileCount }: { fileCount: number }) {
  const { searchQuery, currentFile, revisionMode } = useApp();

  return (
    <>
      <Header />
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
                  <div>Revision mode</div>
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
      <SpeechTimer />
      <MunFact />
      <MyCountrySelector />
    </>
  );
}
