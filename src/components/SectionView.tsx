'use client';

import React from 'react';
import { ParsedSection, SectionItem, getSectionIcon, getSectionColor } from '@/lib/content-parser';

/**
 * Shared section rendering used by both CountryTemplate (country battle cards)
 * and DocumentTemplate (resolutions, resources, speeches, handbooks).
 */
export function SectionCard({ section }: { section: ParsedSection }) {
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

export function SectionItemRow({ item }: { item: SectionItem }) {
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

    case 'numbered':
      return (
        <div className="ct-numbered">
          <span className="ct-num">{item.index}</span>
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
