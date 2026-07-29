'use client';

import React from 'react';
import { AppProvider, useApp } from '@/lib/AppContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import RightPanel from '@/components/RightPanel';
import SpeechTimer from '@/components/SpeechTimer';
import MunFact from '@/components/MunFact';
import MyCountrySelector from '@/components/MyCountrySelector';
import FileViewer from '@/components/FileViewer';
import RelatedContent from '@/components/RelatedContent';
import Scratchpad from '@/components/Scratchpad';
import SearchResults from '@/components/SearchResults';
import { MunFile } from '@/lib/types';

export default function GlobalClient({ fileData, initialFiles }: { fileData: MunFile; initialFiles: MunFile[] }) {
  return (
    <AppProvider initialFiles={initialFiles}>
      <Inner fileData={fileData} />
    </AppProvider>
  );
}

function Inner({ fileData }: { fileData: MunFile }) {
  const { currentFile, searchQuery, revisionMode } = useApp();

  return (
    <>
      <Header />
      <div className="container">
        <Sidebar />
        <main className="main-content">
          <div className="content-header">
            <h2 id="fileTitle">
              {searchQuery ? 'Search Results' : currentFile?.displayName || fileData.displayName}
            </h2>
            {currentFile && <span className="file-path">{currentFile.path}</span>}
          </div>
          <div className="content-body">
            {searchQuery ? (
              <SearchResults />
            ) : (
              <>
                <FileViewer file={currentFile || fileData} />
                {currentFile && <RelatedContent filePath={currentFile.path} />}
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
