/**
 * Content Parser — Parses structured MUN text files into renderable sections.
 *
 * Handles three file formats:
 *   - Global reference files (data/global/)
 *   - UNHRC battle cards (data/unhrc/Countries/)
 *   - UNSC battle cards (data/unsc/Countries/)
 *
 * File markup conventions:
 *   ====================        → major section border (all '=' chars)
 *   SECTION TITLE               → title sits between two = borders
 *   ====================        → closing border
 *   -------------------         → sub-section border (all '-' chars)
 *   SUB TITLE                   → sub-title between - borders
 *   -------------------         → closing border
 *   • bullet text               → bullet item
 *   ✓ / ✗ item                 → pro / con item
 *   Label: Value                → key-value pair
 *   ⭐⭐⭐⭐⭐                    → star rating
 */

// ── Types ──

export interface ParsedSection {
  level: 'major' | 'sub';
  title: string;
  items: SectionItem[];
}

export type SectionItem =
  | { type: 'text'; value: string }
  | { type: 'bullet'; value: string }
  | { type: 'pro'; value: string }
  | { type: 'con'; value: string }
  | { type: 'kv'; label: string; value: string }
  | { type: 'stars'; count: number; label?: string }
  | { type: 'badge'; value: string; variant?: 'ally' | 'opponent' | 'default' }
  | { type: 'divider' };

export interface ParsedContent {
  title: string;
  flag: string;
  committee: string;
  sections: ParsedSection[];
}

// ── Helpers ──

/** Check if a line is a '=' border (≥80% '=' chars, length > 5) */
function isEqBorder(line: string): boolean {
  if (line.length < 6) return false;
  const eqCount = (line.match(/=/g) || []).length;
  return eqCount / line.length >= 0.8;
}

/** Check if a line is a '-' border (≥80% '-' chars, length > 5) */
function isDashBorder(line: string): boolean {
  if (line.length < 6) return false;
  const dashCount = (line.match(/-/g) || []).length;
  return dashCount / line.length >= 0.8;
}

/** Check if a line is any kind of section border (all = or all -) */
function isBorder(line: string): boolean {
  return isEqBorder(line) || isDashBorder(line);
}

/** Get the border type */
function borderType(line: string): 'eq' | 'dash' | null {
  if (isEqBorder(line)) return 'eq';
  if (isDashBorder(line)) return 'dash';
  return null;
}

// ── Parser ──

export function parseContent(content: string, fileName: string, committee: string): ParsedContent {
  const lines = content.split('\n');
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let title = fileName.replace(/\.txt$/i, '').replace(/\.md$/i, '');

  // Parser state
  let lastBorderType: 'eq' | 'dash' | null = null;
  let expectingTitle = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    // ── Detect border lines ──
    if (isBorder(line)) {
      const bt = borderType(line);
      // If we were expecting a title but got another border, cancel
      if (expectingTitle) {
        expectingTitle = false;
      }
      lastBorderType = bt;
      // After a border, the next meaningful line could be a title
      expectingTitle = true;
      continue;
    }

    // ── Empty lines ──
    if (!line) {
      // If we were expecting a title and hit a blank, keep expecting
      if (!expectingTitle && currentSection && currentSection.items.length > 0) {
        const last = currentSection.items[currentSection.items.length - 1];
        if (last.type !== 'divider') {
          currentSection.items.push({ type: 'divider' });
        }
      }
      continue;
    }

    // ── If expecting a title after a border ──
    if (expectingTitle) {
      expectingTitle = false;
      // This line is a title – start a new section
      const level = lastBorderType === 'eq' ? 'major' : 'sub';
      currentSection = { level, title: line, items: [] };
      sections.push(currentSection);
      lastBorderType = null;

      // After a sub-section title, there's often a short underline of dashes.
      // Peek ahead: if the NEXT line is a dash border, skip it.
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (isDashBorder(nextLine) && nextLine.length < line.length + 10) {
          i++; // skip the underline
        }
      }
      continue;
    }

    // ── If no section started yet, skip (preamble) ──
    if (!currentSection) {
      // But capture the first non-empty, non-border line as the document title
      if (line.length > 2 && !line.startsWith('http')) {
        title = line.replace(/[\u{1F1E6}-\u{1F1FF}]{2,4}/gu, '').replace(/\s*\|.*$/, '').trim() || title;
      }
      continue;
    }

    // ── Content items ──

    // Star rating
    const starMatch = line.match(/^(Importance to Committee|Rating|Score):?\s*(⭐+)/);
    if (starMatch) {
      currentSection.items.push({
        type: 'stars',
        count: starMatch[2].length,
        label: starMatch[1].trim(),
      });
      continue;
    }

    // Pro: ✓
    if (line.startsWith('✓')) {
      currentSection.items.push({ type: 'pro', value: line.replace(/^✓\s*/, '').trim() });
      continue;
    }

    // Con: ✗
    if (line.startsWith('✗')) {
      currentSection.items.push({ type: 'con', value: line.replace(/^✗\s*/, '').trim() });
      continue;
    }

    // Bullet: • or leading dash-space
    if (line.startsWith('•') || /^-\s/.test(line)) {
      const text = line.replace(/^[•\-]\s*/, '').trim();
      if (text) {
        currentSection.items.push({ type: 'bullet', value: text });
      }
      continue;
    }

    // Key-value: "Label: Value"
    const kvMatch = line.match(/^([A-Za-z][A-Za-z\s()/]+?):\s+(.+)/);
    if (kvMatch && !line.startsWith('http') && kvMatch[1].length < 45) {
      const label = kvMatch[1].trim();
      const value = kvMatch[2].trim();
      currentSection.items.push({ type: 'kv', label, value });
      continue;
    }

    // Plain text line
    if (line.length > 1) {
      currentSection.items.push({ type: 'text', value: line });
    }
  }

  // Clean up trailing dividers
  for (const section of sections) {
    while (section.items.length > 0 && section.items[section.items.length - 1].type === 'divider') {
      section.items.pop();
    }
  }

  // Extract flag emoji
  const flagMatch = content.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u);
  const flag = flagMatch ? flagMatch[0] : '';

  return { title, flag, committee, sections };
}

/**
 * Get a display-friendly section icon based on section title.
 */
export function getSectionIcon(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('agenda') && t.includes('relevance')) return '🎯';
  if (t.includes('quick summary') || t.includes('summary')) return '📌';
  if (t.includes('basic info') || t.includes('basic information')) return 'ℹ️';
  if (t.includes('official position') || t.includes('position on')) return '🎤';
  if (t.includes('national interest')) return '🎯';
  if (t.includes('strength') || t.includes('pros')) return '✅';
  if (t.includes('weakness') || t.includes('cons')) return '⚠️';
  if (t.includes('defence') || t.includes('defense')) return '🛡️';
  if (t.includes('question') || t.includes('likely question')) return '❓';
  if (t.includes('ally') || t.includes('rival')) return '🤝';
  if (t.includes('economy')) return '💰';
  if (t.includes('military') || t.includes('security')) return '⚔️';
  if (t.includes('geography') || t.includes('influence')) return '🌍';
  if (t.includes('energy') || t.includes('resource')) return '⚡';
  if (t.includes('society')) return '👥';
  if (t.includes('foreign policy')) return '🌐';
  if (t.includes('hot topic')) return '🔥';
  if (t.includes('interesting fact')) return '💡';
  if (t.includes('economy')) return '📊';
  return '📋';
}

/**
 * Get a color class for a section based on its title.
 */
export function getSectionColor(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('strength') || t.includes('pros')) return 'section-green';
  if (t.includes('weakness') || t.includes('cons')) return 'section-red';
  if (t.includes('defence') || t.includes('defense')) return 'section-blue';
  if (t.includes('hot topic')) return 'section-orange';
  if (t.includes('ally')) return 'section-green';
  if (t.includes('rival')) return 'section-red';
  if (t.includes('agenda') && t.includes('relevance')) return 'section-purple';
  if (t.includes('quick summary')) return 'section-blue';
  if (t.includes('basic')) return 'section-default';
  if (t.includes('economy')) return 'section-green';
  if (t.includes('military')) return 'section-red';
  if (t.includes('geography')) return 'section-blue';
  if (t.includes('foreign policy')) return 'section-purple';
  if (t.includes('interesting')) return 'section-yellow';
  return 'section-default';
}