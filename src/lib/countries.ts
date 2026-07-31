import { CountryInfo, MunFile } from './types';

export function getCountryFlag(filename: string): string {
  const name = filename.replace(/\.txt$/i, '').toLowerCase();
  const flags: Record<string, string> = {
    'afghanistan': '🇦🇫', 'china': '🇨🇳', 'france': '🇫🇷', 'india': '🇮🇳',
    'iran': '🇮🇷', 'israel': '🇮🇱', 'myanmar': '🇲🇲', 'north korea': '🇰🇵',
    'pakistan': '🇵🇰', 'palestine': '🇵🇸', 'russia': '🇷🇺', 'saudi arabia': '🇸🇦',
    'syria': '🇸🇾', 'united kingdom': '🇬🇧', 'usa': '🇺🇸',
    'egypt': '🇪🇬', 'germany': '🇩🇪', 'italy': '🇮🇹', 'japan': '🇯🇵',
    'south korea': '🇰🇷', 'türkiye': '🇹🇷', 'turkey': '🇹🇷', 'uae': '🇦🇪',
    'ukraine': '🇺🇦', 'qatar': '🇶🇦',
  };
  return flags[name] || '';
}

export function getFileIcon(filename: string, file?: MunFile): string {
  if (file?.isCountry) {
    const flag = getCountryFlag(filename);
    if (flag) return flag;
  }
  if (filename.includes('README')) return '📖';
  if (filename.includes('Handbook') || filename.includes('Agenda')) return '📋';
  if (filename.includes('Speech') || filename.includes('GSL')) return '🎤';
  if (filename.includes('Resolution') || filename.includes('Clauses')) return '📜';
  if (filename.includes('Aggregated')) return '📊';
  return '📄';
}

export function getFolderIcon(name: string): string {
  if (name === 'UNHRC') return '🕊️';
  if (name === 'UNSC') return '⚓';
  if (name === 'Countries') return '🌐';
  if (name === 'Speeches') return '🎤';
  if (name === 'Resolutions') return '📜';
  if (name === 'Resources') return '📚';
  if (name === 'Agenda') return '📋';
  return '📁';
}

export function getFolderColorClass(name: string): string {
  if (name === 'Countries') return 'color-countries';
  if (name === 'Resources') return 'color-resources';
  if (name === 'Speeches') return 'color-speeches';
  if (name === 'Resolutions') return 'color-resolutions';
  if (name === '00 Agenda Handbook') return 'color-agenda';
  if (name.includes('Agenda')) return 'color-agenda';
  return '';
}

export function parseCountryInfo(content: string): CountryInfo {
  const info: CountryInfo = {};
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('Official Name:')) info.officialName = l.replace('Official Name:', '').trim();
    if (l.startsWith('Capital:')) info.capital = l.replace('Capital:', '').trim();
    if (l.startsWith('Government:')) info.government = l.replace('Government:', '').trim();
    if (l.startsWith('Current Leader:') || l.startsWith('Head of State:') || l.startsWith('Head of Government:'))
      info.leader = l.replace(/^(Current Leader:|Head of State:|Head of Government:)/, '').trim();
    if (l.startsWith('Importance to Committee:')) info.importance = l.replace('Importance to Committee:', '').trim();
    if (l.startsWith('UNSC Status:') || l.startsWith('P5 Member:'))
      info.unscStatus = l.replace(/^(UNSC Status:|P5 Member:)/, '').trim();
    if (l.startsWith('Likely Allies:')) {
      const m = l.match(/^Likely Allies:\s*(.+)/);
      if (m) info.allies = m[1].trim();
    }
    if (l.startsWith('Likely Opponents:')) {
      const m = l.match(/^Likely Opponents?:\s*(.+)/);
      if (m) info.opponents = m[1].trim();
    }
  }
  return info;
}

export function getCountryFiles(files: MunFile[], countryName: string, committee: string): MunFile[] {
  const cName = countryName.toLowerCase();
  return files.filter(f => {
    const fName = f.displayName.toLowerCase();
    return f.isCountry && fName.includes(cName) && f.committee === committee;
  });
}

export function getCountryCommittees(files: MunFile[], countryName: string): string[] {
  const committees = new Set<string>();
  const cName = countryName.toLowerCase();
  files.forEach(f => {
    const fName = f.displayName.toLowerCase();
    if (f.isCountry && fName.includes(cName)) {
      committees.add(f.committee);
    }
  });
  return [...committees];
}

export function extractOutline(content: string): { level: number; text: string }[] {
  const lines = content.split('\n');
  const outline: { level: number; text: string }[] = [];
  const isBorder = (s: string) => /^[=-]{3,}$/.test(s.trim());
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!isBorder(t)) continue;
    const level = t.startsWith('=') ? 0 : 1;
    // Next non-blank line is the candidate section title.
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    const title = lines[j]?.trim() ?? '';
    // A real title is sandwiched between two borders: the line immediately
    // after it must also be a border. (Section content lines are followed by
    // blanks, so they are never mistaken for titles.)
    const nextAfterTitle = lines[j + 1]?.trim() ?? '';
    if (title && isBorder(nextAfterTitle)) {
      outline.push({ level, text: title.slice(0, 80) });
    }
  }
  return outline.slice(0, 30);
}

export function readingTime(text: string): string {
  const words = text.split(/\s+/).length;
  const min = Math.max(1, Math.round(words / 200));
  return `${min} min read`;
}
