'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/lib/AppContext';
import { performSearch, highlightMatch } from '@/lib/search';
import { getFileIcon } from '@/lib/countries';

export default function SearchResults() {
  const { files, searchQuery, setSearchQuery, navigateTo } = useApp();

  const results = useMemo(() => performSearch(files, searchQuery), [files, searchQuery]);

  const queryWords = searchQuery.toLowerCase().trim().split(/\s+/).filter(w => w.length > 1);

  if (!searchQuery) return null;

  return (
    <div className="search-results">
      <div className="search-results-header">
        <span className="search-results-title">
          🔍 {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
        </span>
        <button className="search-results-close" onClick={() => setSearchQuery('')}>✕</button>
      </div>

      {results.slice(0, 30).map(r => (
        <div key={r.file.path} className="search-result-group">
          <div
            className="search-result-file"
            onClick={() => { navigateTo(r.file.path); setSearchQuery(''); }}
          >
            {getFileIcon(r.file.name, r.file)} {r.file.displayName}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '11px' }}>
              {r.file.committee}
            </span>
          </div>
          {r.matches.map((m, i) => (
            <div
              key={i}
              className="search-result-line"
              onClick={() => { navigateTo(r.file.path); setSearchQuery(''); }}
              dangerouslySetInnerHTML={{
                __html: highlightMatch(m.text, queryWords),
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
