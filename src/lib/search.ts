import { MunFile, SearchResult } from './types';

export function performSearch(files: MunFile[], query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: SearchResult[] = [];
  const queryWords = q.split(/\s+/).filter(w => w.length > 1);

  files.forEach(file => {
    if (file.content.length > 500000) return;
    const contentLower = file.content.toLowerCase();
    const nameLower = file.name.toLowerCase();

    let relevance = 0;
    const matches: { lineNum: number; text: string }[] = [];

    if (nameLower.includes(q)) relevance += 10;

    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      if (queryWords.some(w => lineLower.includes(w))) {
        matches.push({ lineNum: i, text: line.trim() });
        relevance += 1;
        if (lineLower.includes(q)) relevance += 2;
      }
      if (matches.length >= 5) break;
    }

    if (relevance > 0) {
      results.push({ file, relevance, matches });
    }
  });

  results.sort((a, b) => b.relevance - a.relevance);
  return results;
}

export function highlightMatch(text: string, words: string[]): string {
  let result = escapeHtml(text);
  words.forEach(w => {
    const re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    result = result.replace(re, '<mark class="match">$1</mark>');
  });
  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
