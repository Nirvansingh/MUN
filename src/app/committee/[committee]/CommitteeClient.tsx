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
import { parseCountryInfo, getCountryFlag } from '@/lib/countries';
import { useSwipeGesture } from '@/lib/use-swipe';

const Widgets = dynamic(() => import('@/components/Widgets'), { ssr: false, loading: () => null });

interface CountryData {
  path: string;
  displayName: string;
  content: string;
}

interface OtherFileData {
  path: string;
  displayName: string;
  category: string;
}

export default function CommitteeClient({
  committeeName,
  countries,
  otherFiles,
  initialFiles,
}: {
  committeeName: string;
  countries: CountryData[];
  otherFiles: OtherFileData[];
  initialFiles: MunFile[];
}) {
  return (
    <AppProvider initialFiles={initialFiles}>
      <LoginOverlay />
      <Inner committeeName={committeeName} countries={countries} otherFiles={otherFiles} />
    </AppProvider>
  );
}

function Inner({ committeeName, countries, otherFiles }: {
  committeeName: string;
  countries: CountryData[];
  otherFiles: OtherFileData[];
}) {
  const { currentFile, revisionMode, searchQuery, navigateTo, sidebarVisible, toggleSidebar, rightPanelVisible, toggleRightPanel } = useApp();
  const committeeIcon = committeeName === 'UNHRC' ? '🕊️' : '⚓';

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
              {searchQuery ? 'Search Results' : currentFile?.displayName || `${committeeIcon} ${committeeName}`}
            </h2>
            {currentFile && <span className="file-path">{currentFile.path}</span>}
          </div>
          <div className="content-body">
            {searchQuery ? (
              <SearchResults />
            ) : currentFile ? (
              <>
                {currentFile.isCountry && <CountryCard file={currentFile} />}
                {revisionMode ? <RevisionView file={currentFile} /> : <FileViewer file={currentFile} />}
                <RelatedContent filePath={currentFile.path} />
                <Scratchpad />
              </>
            ) : (
              <>
                <div className="committee-overview">
                  <h2 className="committee-overview-title">{committeeIcon} {committeeName} Overview</h2>
                  <p className="committee-overview-subtitle">
                    {countries.length} countries · {otherFiles.length} resource files
                  </p>

                  <div className="committee-country-list">
                    {countries.map(c => {
                      const info = parseCountryInfo(c.content);
                      const flag = getCountryFlag(c.displayName + '.txt') || '🌍';
                      const name = c.displayName.replace(/^[^|]*\|/, '').trim() || c.displayName;
                      return (
                        <div key={c.path} className="committee-country-card"
                          onClick={() => navigateTo(c.path)}>
                          <div className="committee-country-flag">{flag}</div>
                          <div className="committee-country-info">
                            <div className="committee-country-name">{name}</div>
                            <div className="committee-country-capital">{info.capital || ''}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {otherFiles.length > 0 && (
                    <div className="committee-resources">
                      <h3>Resources</h3>
                      <div className="committee-resource-list">
                        {otherFiles.map(f => (
                          <div key={f.path} className="committee-resource-item"
                            onClick={() => navigateTo(f.path)}>
                            <span>{f.displayName}</span>
                            <span className="committee-resource-category">{f.category}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
