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
  | { type: 'subheading'; value: string }
  | { type: 'bullet'; value: string }
  | { type: 'numbered'; value: string; index: number }
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

/**
 * Normalize a section title for display: strip leading numbering,
 * bullet markers, and emoji/icon prefixes (e.g. "⚡ QUICK REFERENCE").
 */
function normalizeTitle(title: string): string {
  let t = title.trim();
  t = t.replace(/^\d+[\.\)]\s*/, '');
  t = t.replace(/^[•\-–]\s*/, '');
  // Strip leading emoji / symbols (ranges for common emoji + dingbats)
  t = t.replace(/^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2190}-\u{21FF}\u{2E3A}\u{25A0}-\u{25FF}\s]+/u, '');
  return t.trim();
}

/**
 * A line that could be a section title. Battle-card section titles are short,
 * mostly-uppercase, and not content-like (bullets, KV pairs, numbered/letter items).
 */
function isTitleCandidate(line: string): boolean {
  if (line.length < 2 || line.length > 80) return false;
  if (isBorder(line)) return false;
  if (/^[•\-\u2022✓✗]/.test(line)) return false;       // bullet / pro / con
  if (/^http/i.test(line)) return false;                // links
  if (/^\d+[\.\)]\s/.test(line)) return false;          // numbered items ("1. Title")
  if (/^[A-Z]\.\s/.test(line)) return false;            // letter items ("A. Title")
  // Strip a leading emoji/icon prefix (e.g. "⚡ QUICK REFERENCE") before the uppercase check
  const bare = line.replace(/^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]{1,2}\s*/u, '');
  // Require the title to be mostly uppercase (battle-card headers are all-caps)
  const letters = bare.replace(/[^A-Za-z]/g, '');
  if (letters.length < 3) return false;
  const upper = bare.replace(/[^A-Z]/g, '').length;
  return upper / letters.length >= 0.8;
}

// ── Parser ──

export function parseContent(content: string, fileName: string, committee: string): ParsedContent {
  const lines = content.split('\n');
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let title = fileName.replace(/\.txt$/i, '').replace(/\.md$/i, '');

  // ── Pass 1: identify section titles ──
  // A real title is a short, mostly-uppercase line sandwiched between two borders
  // (preceded by a border AND followed by a border, skipping blanks). This prevents
  // content lines that follow a section's closing border from being eaten as titles.
  const titleLevel: ('major' | 'sub' | null)[] = new Array(lines.length).fill(null);
  for (let i = 0; i < lines.length; i++) {
    const candidate = lines[i].trim();
    if (!candidate || isBorder(candidate) || !isTitleCandidate(candidate)) continue;

    // Previous non-blank line must be a border (the opening border)
    let p = i - 1;
    while (p >= 0 && !lines[p].trim()) p--;
    if (p < 0 || !isBorder(lines[p].trim())) continue;

    // Next non-blank line must be a border (the closing border or dash underline)
    let q = i + 1;
    while (q < lines.length && !lines[q].trim()) q++;
    if (q >= lines.length || !isBorder(lines[q].trim())) continue;

    titleLevel[i] = borderType(lines[p].trim()) === 'eq' ? 'major' : 'sub';
  }

  // ── Pass 2: walk the lines and build sections/items ──
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // A detected section title
    if (titleLevel[i]) {
      currentSection = { level: titleLevel[i] as 'major' | 'sub', title: normalizeTitle(line), items: [] };
      sections.push(currentSection);
      continue;
    }

    // Blank line → divider between items
    if (!line) {
      if (currentSection && currentSection.items.length > 0) {
        const last = currentSection.items[currentSection.items.length - 1];
        if (last.type !== 'divider') {
          currentSection.items.push({ type: 'divider' });
        }
      }
      continue;
    }

    // Standalone border (not part of a title pair) → ignore
    if (isBorder(line)) continue;

    // ── Preamble (before any section starts) ──
    if (!currentSection) {
      // Numbered headers before any border start a section (e.g. General Guide files)
      const preNum = line.match(/^(\d+)[\.\)]\s+(.+)/);
      if (preNum && preNum[2].length >= 3 && preNum[2].length <= 70 && !line.includes(':')) {
        currentSection = { level: 'sub', title: normalizeTitle(line), items: [] };
        sections.push(currentSection);
      } else if (line.length > 2 && !line.startsWith('http')) {
        // Capture the first non-empty, non-border line as the document title
        title = line.replace(/[\u{1F1E6}-\u{1F1FF}]{2,4}/gu, '').replace(/\s*\|.*$/, '').trim() || title;
      }
      continue;
    }

    // ── Content items ──

    // Icon-prefixed short label → subheading (e.g. "⚡ QUICK REFERENCE")
    if (/^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]{1,2}\s*[A-Za-z]/u.test(line) && line.length <= 40) {
      currentSection.items.push({ type: 'subheading', value: normalizeTitle(line) });
      continue;
    }

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
        // Short label-only bullet → subheading (e.g. "• Impact:", "• Debate Use:")
        if (text.length <= 24 && /^[A-Za-z ]+:$/.test(text)) {
          currentSection.items.push({ type: 'subheading', value: text.replace(/:$/, '').trim() });
        } else {
          currentSection.items.push({ type: 'bullet', value: text });
        }
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

    // Subheading: lines like "CURRENT AFFAIR — Title" or "CURRENT AFFAIR — Title"
    if (/^(CURRENT AFFAIR|KEY AFFAIR|KEY ISSUE|RECENT DEVELOPMENT)/i.test(line)) {
      currentSection.items.push({ type: 'subheading', value: line });
      continue;
    }

    // Letter sub-heading: "A. Title", "B. Title", etc.
    const letterMatch = line.match(/^([A-Z])\.\s+(.+)/);
    if (letterMatch && letterMatch[2].length >= 3 && letterMatch[2].length <= 60 && !line.includes(':')) {
      currentSection.items.push({ type: 'subheading', value: line });
      continue;
    }

    // Numbered line: short title → new sub-section; long clause → numbered item
    const numberedMatch = line.match(/^(\d+)[\.\)]\s+(.+)/);
    if (numberedMatch) {
      const text = numberedMatch[2].trim();
      const isHeader =
        text.length >= 3 && text.length <= 70 &&
        !line.includes(':') && !text.endsWith(';');
      if (isHeader) {
        // Start a new sub-section
        currentSection = { level: 'sub', title: normalizeTitle(line), items: [] };
        sections.push(currentSection);
      } else if (text.length > 3) {
        // Long formal clause → render as a numbered item
        currentSection.items.push({ type: 'numbered', value: text, index: parseInt(numberedMatch[1], 10) });
      }
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
  if (t.includes('quick summary') || t.includes('summary') || t.includes('executive summary')) return '📌';
  if (t.includes('basic info') || t.includes('basic information') || t.includes('country overview')) return 'ℹ️';
  if (t.includes('official position') || t.includes('position on')) return '🎤';
  if (t.includes('national interest')) return '🎯';
  if (t.includes('strength') || t.includes('pros') || t.includes('human rights strength')) return '✅';
  if (t.includes('weakness') || t.includes('cons') || t.includes('human rights concern')) return '⚠️';
  if (t.includes('defence') || t.includes('defense') || t.includes('defence argument')) return '🛡️';
  if (t.includes('question') || t.includes('likely question')) return '❓';
  if (t.includes('ally') || t.includes('rival') || t.includes('opponent') || t.includes('bloc')) return '🤝';
  if (t.includes('gsl') || t.includes('talking point')) return '🎤';
  if (t.includes('moderated caucus')) return '💬';
  if (t.includes('resolution idea') || t.includes('resolution')) return '📜';
  if (t.includes('current affair')) return '📰';
  if (t.includes('red line')) return '🚫';
  if (t.includes('mun tip') || t.includes('tip')) return '💡';
  if (t.includes('national ai strategy') || t.includes('ai governance') || t.includes('ai strategy')) return '🤖';
  if (t.includes('data privacy')) return '🔒';
  if (t.includes('mass digital surveillance') || t.includes('surveillance')) return '📷';
  if (t.includes('ai in public service')) return '🏛️';
  if (t.includes('ai in defence') || t.includes('defence') || t.includes('defense')) return '⚔️';
  if (t.includes('cyber security') || t.includes('cybersecurity')) return '🛡️';
  if (t.includes('technology compan') || t.includes('major tech')) return '🏢';
  if (t.includes('international cooperation')) return '🌐';
  if (t.includes('negotiation strategy')) return '🎯';
  if (t.includes('important statistic') || t.includes('quick fact')) return '📊';
  if (t.includes('source') || t.includes('official source')) return '📚';
  if (t.includes('economy')) return '💰';
  if (t.includes('military') || t.includes('security')) return '⚔️';
  if (t.includes('geography') || t.includes('influence')) return '🌍';
  if (t.includes('energy') || t.includes('resource')) return '⚡';
  if (t.includes('society')) return '👥';
  if (t.includes('foreign policy')) return '🌐';
  if (t.includes('hot topic')) return '🔥';
  if (t.includes('interesting fact')) return '💡';
  if (t.includes('quick reference')) return '⚡';
  if (t.includes('preambl')) return '📜';
  if (t.includes('operative')) return '📜';
  if (t.includes('case study')) return '📚';
  if (t.includes('template')) return '📝';
  if (t.includes('key concept') || t.includes('definition')) return '📖';
  if (t.includes('sub-issue') || t.includes('sub issue')) return '🗂️';
  if (t.includes('bloc alignment') || t.includes('bloc')) return '🤝';
  if (t.includes('topic overview') || t.includes('agenda overview')) return '🗺️';
  if (t.includes('official source') || t.includes('international law')) return '📚';
  if (t.includes('treaty') || t.includes('convention')) return '⚖️';
  if (t.includes('statistic') || t.includes('definition')) return '📊';
  return '📋';
}

/**
 * Get a color class for a section based on its title.
 */
export function getSectionColor(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('strength') || t.includes('pros') || t.includes('human rights strength')) return 'section-green';
  if (t.includes('weakness') || t.includes('cons') || t.includes('human rights concern')) return 'section-red';
  if (t.includes('defence') || t.includes('defense') || t.includes('defence argument')) return 'section-blue';
  if (t.includes('hot topic')) return 'section-orange';
  if (t.includes('current affair')) return 'section-blue';
  if (t.includes('gsl') || t.includes('talking point')) return 'section-purple';
  if (t.includes('moderated caucus')) return 'section-orange';
  if (t.includes('resolution idea') || t.includes('resolution')) return 'section-purple';
  if (t.includes('red line')) return 'section-red';
  if (t.includes('ally') || t.includes('rival') || t.includes('opponent') || t.includes('bloc')) return 'section-purple';
  if (t.includes('question')) return 'section-orange';
  if (t.includes('mun tip') || t.includes('tip')) return 'section-yellow';
  if (t.includes('agenda') && t.includes('relevance')) return 'section-purple';
  if (t.includes('quick summary') || t.includes('executive summary')) return 'section-blue';
  if (t.includes('basic') || t.includes('country overview')) return 'section-default';
  if (t.includes('national interest') || t.includes('negotiation strategy')) return 'section-orange';
  if (t.includes('official position') || t.includes('position on ai')) return 'section-blue';
  if (t.includes('national ai strategy') || t.includes('ai governance')) return 'section-purple';
  if (t.includes('data privacy')) return 'section-blue';
  if (t.includes('mass digital surveillance') || t.includes('surveillance')) return 'section-red';
  if (t.includes('ai in public service')) return 'section-green';
  if (t.includes('ai in defence') || t.includes('cyber')) return 'section-red';
  if (t.includes('technology compan')) return 'section-default';
  if (t.includes('international cooperation')) return 'section-purple';
  if (t.includes('important statistic') || t.includes('quick fact')) return 'section-yellow';
  if (t.includes('source')) return 'section-default';
  if (t.includes('economy')) return 'section-green';
  if (t.includes('military')) return 'section-red';
  if (t.includes('geography')) return 'section-blue';
  if (t.includes('foreign policy')) return 'section-purple';
  if (t.includes('interesting')) return 'section-yellow';
  if (t.includes('quick reference')) return 'section-yellow';
  if (t.includes('preambl') || t.includes('operative')) return 'section-purple';
  if (t.includes('case study')) return 'section-blue';
  if (t.includes('template')) return 'section-purple';
  if (t.includes('key concept') || t.includes('definition')) return 'section-blue';
  if (t.includes('sub-issue') || t.includes('sub issue')) return 'section-orange';
  if (t.includes('bloc')) return 'section-orange';
  if (t.includes('topic overview')) return 'section-blue';
  if (t.includes('official source') || t.includes('international law')) return 'section-default';
  if (t.includes('treaty') || t.includes('convention')) return 'section-blue';
  return 'section-default';
}