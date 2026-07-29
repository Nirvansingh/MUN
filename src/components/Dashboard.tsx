'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/lib/AppContext';
import { getFileIcon, getCountryFlag } from '@/lib/countries';
import { getCountryFiles } from '@/lib/file-helpers';

export default function Dashboard() {
  const { files, myCountry, pinnedFiles, recentFiles, navigateTo, setSelectedCommittee } = useApp();

  const stats = useMemo(() => {
    const countryFiles = files.filter(f => f.isCountry);
    return {
      unhrcCount: countryFiles.filter(f => f.committee === 'UNHRC').length,
      unscCount: countryFiles.filter(f => f.committee === 'UNSC').length,
      totalFiles: files.length,
    };
  }, [files]);

  const greetings = [
    'Welcome back, Delegate.',
    'Ready for committee?',
    "Today's agenda awaits.",
    'Research smarter.',
    "Let's draft a resolution.",
    'Committee starts soon.',
    'Back to diplomacy.',
  ];
  const dayIndex = new Date().getDate() + new Date().getMonth() * 31;
  const greeting = greetings[dayIndex % greetings.length];

  return (
    <div id="homeDashboard">
      <div className="dashboard-welcome">
        <h2>{greeting}, Delegate.</h2>
        <p>{stats.totalFiles} research files ready · {stats.unhrcCount} UNHRC · {stats.unscCount} UNSC</p>
      </div>

      {myCountry && <MyCountryDashboardSection />}

      <div className="dashboard-committees">
        <div className="dashboard-committee-card" onClick={() => setSelectedCommittee('UNHRC')}>
          <span className="dc-icon">🕊️</span>
          <div className="dc-name">UNHRC</div>
          <div className="dc-count">{stats.unhrcCount} countries · AI & Privacy</div>
        </div>
        <div className="dashboard-committee-card" onClick={() => setSelectedCommittee('UNSC')}>
          <span className="dc-icon">⚓</span>
          <div className="dc-name">UNSC</div>
          <div className="dc-count">{stats.unscCount} countries · Supply Chains & Maritime</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card-title">📌 Pinned Documents</div>
          {pinnedFiles.length === 0 ? (
            <div className="dashboard-empty">Pin files for quick access</div>
          ) : (
            pinnedFiles.slice(0, 8).map(p => {
              const f = files.find(fi => fi.path === p);
              if (!f) return null;
              return (
                <div key={p} className="dashboard-card-item" onClick={() => navigateTo(f.path)}>
                  <span className="item-icon">{getFileIcon(f.name, f)}</span>
                  <span className="item-name">{f.displayName}</span>
                  <span className="item-committee">{f.committee}</span>
                </div>
              );
            })
          )}
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-title">🕐 Recently Viewed</div>
          {recentFiles.length === 0 ? (
            <div className="dashboard-empty">Open a file to see it here</div>
          ) : (
            recentFiles.slice(0, 8).map(p => {
              const f = files.find(fi => fi.path === p);
              if (!f) return null;
              return (
                <div key={p} className="dashboard-card-item" onClick={() => navigateTo(f.path)}>
                  <span className="item-icon">{getFileIcon(f.name, f)}</span>
                  <span className="item-name">{f.displayName}</span>
                  <span className="item-committee">{f.committee}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <DashboardCategoryCard title="🎤 Quick Speech Access" category="Speeches" />
        <DashboardCategoryCard title="📜 Resolution Drafting" category="Resolutions" />
      </div>
    </div>
  );
}

function DashboardCategoryCard({ title, category }: { title: string; category: string }) {
  const { files, navigateTo } = useApp();
  const catFiles = useMemo(
    () => files.filter(f => f.parts[1] === category && f.committee !== 'General Guide').slice(0, 4),
    [files, category]
  );

  if (catFiles.length === 0) {
    return (
      <div className="dashboard-card">
        <div className="dashboard-card-title">{title}</div>
        <div className="dashboard-empty">No files in this category</div>
      </div>
    );
  }

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-title">{title}</div>
      {catFiles.map(f => (
        <div key={f.path} className="dashboard-card-item" onClick={() => navigateTo(f.path)}>
          <span className="item-icon">{getFileIcon(f.name, f)}</span>
          <span className="item-name">{f.displayName}</span>
          <span className="item-committee">{f.committee}</span>
        </div>
      ))}
    </div>
  );
}

function MyCountryDashboardSection() {
  const { files, myCountry, navigateTo } = useApp();

  if (!myCountry) return null;

  const flag = getCountryFlag(myCountry.name + '.txt') || '🎯';
  const countryFiles = getCountryFiles(files, myCountry.name, myCountry.committee);
  const committeeIcon = myCountry.committee === 'UNHRC' ? '🕊️' : '⚓';

  const relatedFiles = files.filter(f =>
    f.committee === myCountry.committee &&
    f.path !== (countryFiles[0]?.path ?? '') &&
    (f.parts[1] === 'Speeches' || f.parts[1] === 'Resolutions' || f.parts[1] === 'Resources')
  ).slice(0, 6);

  return (
    <div className="dashboard-my-country">
      <div className="dashboard-my-country-header">
        <span className="dashboard-my-country-flag">{flag}</span>
        <div className="dashboard-my-country-info">
          <div className="dashboard-my-country-name">{myCountry.name}</div>
          <div className="dashboard-my-country-meta">
            {committeeIcon} {myCountry.committee} · {countryFiles.length} file{countryFiles.length !== 1 ? 's' : ''}
          </div>
        </div>
        {countryFiles[0] && (
          <button className="dashboard-my-country-open btn" onClick={() => navigateTo(countryFiles[0].path)}>
            📂 Open
          </button>
        )}
      </div>
      {relatedFiles.length > 0 && (
        <div className="dashboard-my-country-related">
          <div className="dashboard-my-country-related-title">Related resources</div>
          <div className="related-grid">
            {relatedFiles.map(f => (
              <span key={f.path} className="related-chip" onClick={() => navigateTo(f.path)}>
                {getFileIcon(f.name, f)} {f.displayName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
