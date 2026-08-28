'use client';

import React from 'react';
import { MunFile } from '@/lib/types';
import { parseCountryInfo, getCountryFlag } from '@/lib/countries';

export default function CountryCard({ file }: { file: MunFile }) {
  const info = parseCountryInfo(file.content, file.name);
  const flag = getCountryFlag(file.name) || '🌍';
  const name = file.displayName.replace(/^[^|]*\|/, '').trim() || file.displayName;
  const isMyDelegation = name.toLowerCase() === 'philippines' || info.delegate?.toLowerCase().includes('nirvansingh');

  const fields = [
    { label: 'Delegate', value: info.delegate },
    { label: 'Capital', value: info.capital },
    { label: 'Government', value: info.government },
    { label: 'UNSC Status', value: info.unscStatus },
    { label: 'Committee Importance', value: info.importance },
    { label: 'Targetability', value: info.targetability },
  ];

  const allies = info.allies?.split(',').slice(0, 5).map(a => a.trim()) || [];
  const opponents = info.opponents?.split(',').slice(0, 5).map(o => o.trim()) || [];

  if (!file.isCountry) return null;

  return (
    <div className={`country-card ${isMyDelegation ? 'my-delegation-card' : ''}`}>
      <div className="country-card-header">
        <span className="country-card-flag">{flag}</span>
        <span className="country-card-name">{name}</span>
        {isMyDelegation && (
          <span className="my-delegation-badge" title="User Assigned Delegation">
            ⭐ My Delegation
          </span>
        )}
        {info.targetability && (
          <span className={`targetability-badge target-${info.targetability.toLowerCase()}`}>
            {info.targetability}
          </span>
        )}
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
