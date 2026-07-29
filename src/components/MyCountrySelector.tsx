'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/AppContext';
import { getCountryFlag, getCountryCommittees } from '@/lib/countries';
import { getCountryFiles } from '@/lib/files';

export default function MyCountrySelector() {
  const { files, myCountry, setMyCountry, navigateTo } = useApp();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedComm, setSelectedComm] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setVisible(v => !v);
    window.addEventListener('open-my-country', handler);
    return () => window.removeEventListener('open-my-country', handler);
  }, []);

  const countries = useMemo(() => {
    const countryMap = new Map<string, Set<string>>();
    files.forEach(f => {
      if (!f.isCountry) return;
      const name = f.displayName.replace(/^[^|]*\|/, '').trim() || f.displayName;
      if (!countryMap.has(name)) countryMap.set(name, new Set());
      countryMap.get(name)!.add(f.committee);
    });
    return [...countryMap.entries()]
      .map(([name, committees]) => ({ name, committees: [...committees] }))
      .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [files, search]);

  const handleSelect = (name: string) => {
    setSelectedName(name);
    const country = countries.find(c => c.name === name);
    if (country) {
      if (country.committees.length > 1) {
        setSelectedComm(country.committees[0]);
      } else {
        setSelectedComm(country.committees[0]);
      }
    }
  };

  const handleConfirm = () => {
    if (!selectedName || !selectedComm) return;
    setMyCountry({ name: selectedName, committee: selectedComm });
    setVisible(false);

    const cName = selectedName.toLowerCase();
    const countryFile = files.find(f => {
      const fName = f.displayName.toLowerCase();
      return f.isCountry && fName.includes(cName) && f.committee === selectedComm;
    });
    if (countryFile) navigateTo(countryFile.path);
  };

  const handleClear = () => {
    setMyCountry(null);
    setSelectedName(null);
    setSelectedComm(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="widget-overlay" onClick={() => setVisible(false)}>
      <div className="widget-popup country-popup" onClick={e => e.stopPropagation()}>
        <div className="widget-popup-header">
          <span className="widget-popup-title">🎯 Select Your Country</span>
          <button className="widget-popup-close" onClick={() => setVisible(false)}>✕</button>
        </div>
        <div className="widget-popup-body">
          <div className="country-select-search">
            <input type="text" className="search-input" placeholder="🔍 Search countries..."
              value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div className="country-select-list">
            {countries.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No countries found
              </div>
            ) : (
              countries.map(c => {
                const flag = getCountryFlag(c.name + '.txt') || '🌍';
                const isSelected = selectedName === c.name;
                return (
                  <div
                    key={c.name}
                    className={`country-select-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(c.name)}
                  >
                    <span className="country-flag">{flag}</span>
                    <span className="country-name">{c.name}</span>
                    <span className="country-badges">
                      {c.committees.map(cm => (
                        <span key={cm} className={`country-badge ${cm === 'UNHRC' ? 'unhrc' : cm === 'UNSC' ? 'unsc' : 'global'}`}>
                          {cm}
                        </span>
                      ))}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          {selectedName && selectedComm && (
            <div className="country-select-committees">
              <div className="country-select-subtitle">
                Committee for {selectedName}:
              </div>
              <div className="committee-options">
                {countries.find(c => c.name === selectedName)?.committees.map(cm => (
                  <button
                    key={cm}
                    className={`committee-option-btn ${selectedComm === cm ? 'selected' : ''}`}
                    onClick={() => setSelectedComm(cm)}
                  >
                    {cm === 'UNHRC' ? '🕊️' : '⚓'} {cm}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="widget-popup-footer">
          <button className="widget-btn" style={{ marginRight: 'auto', borderColor: '#ef4444', color: '#ef4444' }}
            onClick={handleClear}>🗑️ Clear</button>
          <button className="widget-btn" style={{ background: 'var(--accent-blue)', color: '#fff', borderColor: 'var(--accent-blue)' }}
            onClick={handleConfirm}>✅ Confirm</button>
        </div>
      </div>
    </div>
  );
}
