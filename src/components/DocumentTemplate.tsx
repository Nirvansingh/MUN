'use client';

import React from 'react';
import { MunFile } from '@/lib/types';
import { parseContent } from '@/lib/content-parser';
import { getFileIcon } from '@/lib/countries';
import { SectionCard } from './SectionView';

/**
 * Generic structured viewer for non-country documents (Resolutions,
 * Resources, Speeches, Agenda Handbooks). Parses the battle-card markup
 * and renders it as styled cards, falling back to raw text when the file
 * has no structured sections.
 */
export default function DocumentTemplate({ file }: { file: MunFile }) {
  const parsed = parseContent(file.content, file.name, file.committee);
  const icon = getFileIcon(file.name, file) || '📄';

  const nonEmptySections = parsed.sections.filter(s => s.items.length > 0);

  // No structured sections — show raw content
  if (nonEmptySections.length === 0) {
    return <pre className="file-viewer">{file.content}</pre>;
  }

  return (
    <div className="country-template document-template">
      {/* ── Header ── */}
      <div className="ct-header">
        <div className="ct-header-main">
          <span className="ct-flag">{icon}</span>
          <div className="ct-header-info">
            <h1 className="ct-title">{parsed.title}</h1>
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
    </div>
  );
}
