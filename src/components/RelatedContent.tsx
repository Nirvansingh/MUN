'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/lib/AppContext';
import { getFileIcon } from '@/lib/countries';

export default function RelatedContent({ filePath }: { filePath: string }) {
  const { files, navigateTo } = useApp();

  const related = useMemo(() => {
    const file = files.find(f => f.path === filePath);
    if (!file) return [];

    const committee = file.committee;
    const category = file.category;
    const nameLower = file.displayName.toLowerCase();
    const countryMatch = nameLower.match(/^[a-z\s-]+/);
    const countryName = countryMatch ? countryMatch[0].trim() : '';

    const results: { file: typeof file; reason: string }[] = [];

    files.forEach(f => {
      if (f.path === filePath) return;
      if (f.committee !== committee) return;

      const fNameLower = f.displayName.toLowerCase();
      if (countryName && fNameLower.includes(countryName) && f.category !== category) {
        results.push({ file: f, reason: 'related' });
        return;
      }
      if (f.category === category && f.parts[1] === file.parts[1]) {
        results.push({ file: f, reason: 'same' });
      }
    });

    return results.slice(0, 8);
  }, [files, filePath]);

  if (related.length === 0) return null;

  return (
    <div className="related-content">
      <div className="related-title">📎 Related Files</div>
      <div className="related-grid">
        {related.map(r => (
          <span
            key={r.file.path}
            className="related-chip"
            onClick={() => navigateTo(r.file.path)}
          >
            {getFileIcon(r.file.name, r.file)} {r.file.displayName}
          </span>
        ))}
      </div>
    </div>
  );
}
