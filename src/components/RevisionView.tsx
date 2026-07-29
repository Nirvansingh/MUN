'use client';

import React, { useMemo } from 'react';
import { MunFile } from '@/lib/types';

export default function RevisionView({ file }: { file: MunFile }) {
  const html = useMemo(() => {
    const content = file.content;
    const lines = content.split('\n');
    const isGlobalRef = file.path.startsWith('global');

    if (isGlobalRef) {
      return renderGlobalRefRevision(file, lines);
    }
    return renderBattleCardRevision(file, lines);
  }, [file]);

  return <div className="revision-view" dangerouslySetInnerHTML={{ __html: html }} />;
}

function renderBattleCardRevision(file: MunFile, lines: string[]): string {
  const sections: Record<string, string[]> = {
    'Position': [],
    'Strengths': [],
    'Weaknesses': [],
    'Statistics': [],
    'GSL': [],
    'Talking Points': [],
    'Defence Points': [],
    'Defence': [],
    'Solutions': [],
    'Questions': [],
    'Hot Topics': [],
    'Current Affairs': [],
    'Resolutions': [],
    'Resoltuion Ideas': [],
  };

  let currentSection = '';
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('GSL TALKING POINTS') || t.startsWith('GENERAL SPEAKER')) { currentSection = 'GSL'; continue; }
    if (t.startsWith('MODERATED CAUCUS')) { currentSection = 'Talking Points'; continue; }
    if (t.startsWith('RESOLUTION IDEAS') || t.startsWith('Resoltuion Ideas')) { currentSection = 'Resolutions'; continue; }
    if (t.startsWith('CURRENT AFFAIRS')) { currentSection = 'Current Affairs'; continue; }
    if (t.startsWith('STRENGTHS')) { currentSection = 'Strengths'; continue; }
    if (t.startsWith('WEAKNESSES')) { currentSection = 'Weaknesses'; continue; }
    if (t.startsWith('KEY DEFENCE POINTS') || t.startsWith('DEFENCE POINTS')) { currentSection = 'Defence'; continue; }
    if (t.startsWith('SOLUTIONS')) { currentSection = 'Solutions'; continue; }
    if (t.startsWith('HOT TOPICS')) { currentSection = 'Hot Topics'; continue; }
    if (t.startsWith('STATISTICS')) { currentSection = 'Statistics'; continue; }

    if (currentSection && sections[currentSection]) {
      if (t && !t.startsWith('---') && !t.startsWith('===') && !t.startsWith('OFFICIAL SOURCES')) {
        sections[currentSection].push(t);
      }
    }
  }

  let html = '<div class="rv-section"><div class="rv-label">📋 Quick Revision</div>' +
    `<div class="rv-content" style="font-size:12px;color:var(--text-muted);">${file.displayName} · ${file.committee}</div></div>`;

  const order = ['Hot Topics', 'Position', 'Strengths', 'Weaknesses', 'Current Affairs', 'GSL', 'Talking Points', 'Resolutions', 'Defence', 'Solutions', 'Statistics'];
  order.forEach(key => {
    if (sections[key]?.length) {
      html += `<div class="rv-section"><div class="rv-label">${key}</div><div class="rv-content">`;
      sections[key].slice(0, 8).forEach(line => {
        if (line.startsWith('•') || line.startsWith('✓') || line.startsWith('✗')) {
          html += `<span class="rv-tag">${line}</span> `;
        } else if (line.startsWith('CURRENT AFFAIR')) {
          html += `<strong style="color:var(--text-heading)">${line}</strong><br>`;
        } else {
          html += line + '<br>';
        }
      });
      html += '</div></div>';
    }
  });

  return html;
}

function renderGlobalRefRevision(file: MunFile, lines: string[]): string {
  const sectionMap: Record<string, string> = {
    'QUICK SUMMARY': 'Quick Summary',
    'BASIC INFORMATION': 'Basic Info',
    'ECONOMY': 'Economy',
    'MILITARY & SECURITY': 'Military & Security',
    'GEOGRAPHY & INFLUENCE': 'Geography',
    'ENERGY & RESOURCES': 'Energy & Resources',
    'SOCIETY': 'Society',
    'FOREIGN POLICY': 'Foreign Policy',
    'ALLIANCES & RIVALRIES': 'Alliances & Rivals',
    'NATIONAL INTERESTS & CHALLENGES': 'Interests & Challenges',
    'INTERESTING FACTS': 'Facts',
  };

  const sections: Record<string, string[]> = {};
  Object.keys(sectionMap).forEach(k => { sections[k] = []; });

  let currentSection = '';
  for (const line of lines) {
    const t = line.trim();
    if (/^={2,}\s*$/.test(t)) continue;
    const upper = t.toUpperCase();
    if (sectionMap[upper]) {
      currentSection = upper;
      continue;
    }
    if (currentSection && sections[currentSection]) {
      if (t && !t.startsWith('===') && !t.startsWith('---')) {
        sections[currentSection].push(t);
      }
    }
  }

  let html = '<div class="rv-section"><div class="rv-label">📋 Country Profile</div>' +
    `<div class="rv-content" style="font-size:12px;color:var(--text-muted);">${file.displayName} · Global Reference</div></div>`;

  const order = ['QUICK SUMMARY', 'BASIC INFORMATION', 'ECONOMY', 'MILITARY & SECURITY', 'GEOGRAPHY & INFLUENCE', 'ENERGY & RESOURCES', 'SOCIETY', 'FOREIGN POLICY', 'ALLIANCES & RIVALRIES', 'NATIONAL INTERESTS & CHALLENGES', 'INTERESTING FACTS'];
  order.forEach(key => {
    if (sections[key]?.length) {
      const label = sectionMap[key];
      const contentLines = sections[key].filter(l => l && !l.startsWith('=') && !l.startsWith('-') && !l.startsWith('SOURCES'));
      if (!contentLines.length) return;

      html += `<div class="rv-section"><div class="rv-label">${label}</div><div class="rv-content">`;
      contentLines.slice(0, 14).forEach(line => {
        if (line.startsWith('•') || line.startsWith('✓') || line.startsWith('✗')) {
          html += `<span class="rv-tag">${line}</span> `;
        } else if (line.includes(', ') && line.length > 60) {
          line.split(', ').slice(0, 8).forEach(item => {
            const cleaned = item.replace(/^•\s*/, '').trim();
            if (cleaned) html += `<span class="rv-tag">${cleaned}</span> `;
          });
        } else {
          html += line + '<br>';
        }
      });
      html += '</div></div>';
    }
  });

  return html;
}
