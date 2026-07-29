'use client';

import React from 'react';
import { MunFile } from '@/lib/types';
import { parseCountryInfo, getCountryFlag } from '@/lib/countries';

export default function CountryCard({ file }: { file: MunFile }) {
  const info = parseCountryInfo(file.content);
  const flag = getCountryFlag(file.name) || '🌍';
  const name = file.displayName.replace(/^[^|]*\|/, '').trim() || file.displayName;

  const fields = [
    { label: 'Capital', value: info.capital },
    { label: 'Government', value: info.government },
    { label: 'UNSC Status', value: info.unscStatus },
    { label: 'Committee Importance', value: info.importance },
  ];

  const allies = info.allies?.split(',').slice(0, 5).map(a => a.trim()) || [];
  const opponents = info.opponents?.split(',').slice(0, 5).map(o => o.trim()) || [];

  if (!file.isCountry) return null;

  return (
    <div className="country-card">
      <div className="country-card-header">
        <span className="country-card-flag">{flag}</span>
        <span className="country-card-name">{name}</span>
      </div>
      <div className="country-card-grid">
        {fields.filter(f => f.value).map(f => (
          <div key={f.label} className="country-card-item">
            <span className="country-card-label">{f.label}</span>
            <span className="country-card-value">{f.value}</span>
          </div>
        ))}
      </div>
      {(allies.length > 0 || opponents.length > 0) && (
        <div className="country-card-badges">
          {allies.map(a => (
            <span key={a} className="country-card-badge ally">🤝 {a}</span>
          ))}
          {opponents.map(o => (
            <span key={o} className="country-card-badge opponent">⚔️ {o}</span>
          ))}
        </div>
      )}
    </div>
  );
}
