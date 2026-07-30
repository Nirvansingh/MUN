'use client';

import React from 'react';
import { MunFile } from '@/lib/types';
import { parseContent, getSectionIcon, getSectionColor, ParsedSection, SectionItem } from '@/lib/content-parser';
import { getCountryFlag } from '@/lib/countries';
import GslGenerator from './GslGenerator';

export default function CountryTemplate({ file }: { file: MunFile }) {
  const parsed = parseContent(file.content, file.name, file.committee);
  const flag = getCountryFlag(file.name) || parsed.flag || '🌍';

  // Clean display name
  const displayName = file.displayName
    .replace(/^[^|]*\|/, '')
    .replace(/\.txt$/i, '')
    .trim() || file.displayName;

  // Filter out empty sections (e.g. the title banner which parses as an empty section)
  const nonEmptySections = parsed.sections.filter(s => s.items.length > 0);

  // If no sections parsed at all, fall back to raw content
  if (nonEmptySections.length === 0) {
    return <pre className="file-viewer">{file.content}</pre>;
  }

  return (
    <div className="country-template">
      {/* ── Header ── */}
      <div className="ct-header">
        <div className="ct-header-main">
          <span className="ct-flag">{flag}</span>
          <div className="ct-header-info">
            <h1 className="ct-title">{displayName}</h1>
            <div className="ct-header-meta">
              <span className={`ct-committee-badge committee-${file.committee.toLowerCase().replace(/\s+/g, '-')}`}>
                {file.committee}
              </span>
              <span className="ct-category-badge">{file.category}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="ct-sections">
        {nonEmptySections.map((section, idx) => (
          <SectionCard key={idx} section={section} />
        ))}
      </div>

      {/* ── GSL Generator ── */}
      <GslGenerator file={file} committee={file.committee} />
    </div>
  );
}

function SectionCard({ section }: { section: ParsedSection }) {
  const icon = getSectionIcon(section.title);
  const colorClass = getSectionColor(section.title);

  return (
    <div className={`ct-section ${colorClass}`}>
      <div className="ct-section-header">
        <span className="ct-section-icon">{icon}</span>
        <h2 className="ct-section-title">{section.title}</h2>
      </div>
      <div className="ct-section-body">
        {section.items.map((item, idx) => (
          <SectionItemRow key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}

function SectionItemRow({ item }: { item: SectionItem }) {
  switch (item.type) {
    case 'text':
      return <p className="ct-text">{item.value}</p>;

    case 'subheading':
      return <div className="ct-subheading">{item.value}</div>;

    case 'bullet':
      return (
        <div className="ct-bullet">
          <span className="ct-bullet-dot">•</span>
          <span>{item.value}</span>
        </div>
      );

    case 'pro':
      return (
        <div className="ct-pro">
          <span className="ct-pro-icon">✅</span>
          <span>{item.value}</span>
        </div>
      );

    case 'con':
      return (
        <div className="ct-con">
          <span className="ct-con-icon">❌</span>
          <span>{item.value}</span>
        </div>
      );

    case 'kv':
      return (
        <div className="ct-kv">
          <span className="ct-kv-label">{item.label}</span>
          <span className="ct-kv-value">{item.value}</span>
        </div>
      );

    case 'stars': {
      const stars = '⭐'.repeat(Math.min(item.count, 5));
      const empty = '☆'.repeat(Math.max(0, 5 - item.count));
      return (
        <div className="ct-stars">
          {item.label && <span className="ct-stars-label">{item.label}: </span>}
          <span className="ct-stars-value">{stars}{empty}</span>
          <span className="ct-stars-count">({item.count}/5)</span>
        </div>
      );
    }

    case 'badge':
      return (
        <span className={`ct-badge ${item.variant || 'default'}`}>
          {item.value}
        </span>
      );

    case 'divider':
      return <hr className="ct-divider" />;

    default:
      return null;
  }
}