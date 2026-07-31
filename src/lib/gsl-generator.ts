/**
 * GSL Speech Generator — Generates committee-ready GSL speeches from country battle card data.
 *
 * This is a template-based engine that extracts real data from the country file
 * and assembles it into structured, diplomatically-sound speeches.
 * No external AI API required — all content is sourced from the research hub.
 */

import { MunFile } from './types';

// ── Types ──

export interface GslSpeechMeta {
  hook: string;
  countryPosition: string;
  keyFactsUsed: string[];
  solutionsMentioned: string[];
  estimatedTime: string;
}

export interface GslOutput {
  speech: string;
  meta: GslSpeechMeta;
}

export type SpeechLength = '60' | '90' | '120';

// ── Section Extraction Helpers ──

function extractSection(lines: string[], sectionName: string): string[] {
  const results: string[] = [];
  let inSection = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^={2,}\s*$/.test(t) || /^-{2,}\s*$/.test(t)) continue;
    if (t.toUpperCase().startsWith(sectionName.toUpperCase())) {
      inSection = true;
      continue;
    }
    if (inSection) {
      if (/^-{2,}\s*$/.test(t) && t.length > 5) break;
      if (/^={2,}\s*$/.test(t) && t.length > 5) break;
      if (/^[A-Z][A-Z\s]{3,}\s*$/.test(t) && t.length > 10 && !t.includes('•')) break;
      const clean = t.replace(/^[•✓✗\-]\s*/, '').trim();
      if (clean) results.push(clean);
    }
  }
  return results;
}

function extractKeyValue(content: string, label: string): string {
  const match = content.match(new RegExp(`${label}:\\s*(.+)`, 'i'));
  return match ? match[1].trim() : '';
}

function extractLinesAfter(lines: string[], marker: string, maxLines = 20): string[] {
  const results: string[] = [];
  let found = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t) return results;
    if (!found && t.toUpperCase().includes(marker.toUpperCase())) {
      found = true;
      continue;
    }
    if (found) {
      if (/^-{2,}\s*$/.test(t) && t.length > 5) break;
      if (/^[A-Z][A-Z\s]{3,}\s*$/.test(t) && t.length > 10 && !t.includes('•') && !t.includes(':')) break;
      const clean = t.replace(/^[•✓✗\-]\s*/, '').trim();
      if (clean) results.push(clean);
      if (results.length >= maxLines) break;
    }
  }
  return results;
}

function extractCurrentAffairs(lines: string[]): { title: string; details: string[] }[] {
  const affairs: { title: string; details: string[] }[] = [];
  let current: { title: string; details: string[] } | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^CURRENT AFFAIR\s*[—–-]\s*/i.test(t)) {
      if (current) affairs.push(current);
      current = { title: t.replace(/^CURRENT AFFAIR\s*[—–-]\s*/i, '').trim(), details: [] };
      continue;
    }
    if (/^-{2,}\s*$/.test(t) && t.length > 5) {
      if (current) affairs.push(current);
      current = null;
      continue;
    }
    if (current) {
      const clean = t.replace(/^[•✓✗\-]\s*/, '').trim();
      if (clean) current.details.push(clean);
    }
  }
  if (current) affairs.push(current);
  return affairs;
}

// ── Data Extraction ──

interface CountryData {
  name: string;
  officialName: string;
  committee: string;
  agenda: string;
  government: string;
  leader: string;
  isP5: boolean;
  importance: string;
  hotTopics: string[];
  officialPosition: string[];
  nationalInterests: string[];
  strengths: string[];
  weaknesses: string[];
  defencePoints: string[];
  gslPoints: string[];
  resolutionIdeas: string[];
  currentAffairs: { title: string; details: string[] }[];
  allies: string[];
  opponents: string[];
  munTips: string[];
  statistics: string[];
  agendaRelevance: string;
}

function extractCountryData(file: MunFile, committee: string, agenda: string): CountryData {
  const lines = file.content.split('\n');
  const content = file.content;
  const name = file.displayName.replace(/\.txt$/i, '').replace(/^[^|]*\|/, '').trim() || file.displayName;

  return {
    name,
    officialName: extractKeyValue(content, 'Official Name') || name,
    committee,
    agenda,
    government: extractKeyValue(content, 'Government') || extractKeyValue(content, 'Govt') || '',
    leader: extractKeyValue(content, 'Head') || extractKeyValue(content, 'Current Leader') || extractKeyValue(content, 'President') || '',
    isP5: content.toUpperCase().includes('P5: YES') || content.toUpperCase().includes('P5 MEMBER: YES'),
    importance: extractKeyValue(content, 'Importance to Committee') || '',
    hotTopics: extractLinesAfter(lines, 'Hot Topics', 10),
    officialPosition: extractSection(lines, 'OFFICIAL POSITION ON AGENDA'),
    nationalInterests: extractSection(lines, 'NATIONAL INTERESTS'),
    strengths: extractSection(lines, 'STRENGTHS'),
    weaknesses: extractSection(lines, 'WEAKNESSES'),
    defencePoints: extractSection(lines, 'DEFENCE POINTS'),
    gslPoints: extractSection(lines, 'GSL TALKING POINTS'),
    resolutionIdeas: extractSection(lines, 'RESOLUTION IDEAS'),
    currentAffairs: extractCurrentAffairs(lines),
    allies: extractKeyValue(content, 'Likely Allies') ? extractKeyValue(content, 'Likely Allies').split(',').map(s => s.trim()).filter(Boolean) : [],
    opponents: extractKeyValue(content, 'Likely Opponents') ? extractKeyValue(content, 'Likely Opponents').split(',').map(s => s.trim()).filter(Boolean) : [],
    munTips: extractSection(lines, 'MUN TIPS'),
    statistics: extractSection(lines, 'STATISTICS'),
    agendaRelevance: extractSection(lines, 'AGENDA RELEVANCE').join(' '),
  };
}

// ── Hook Templates ──

const hookTemplates: ((data: CountryData) => string)[] = [
  // Shocking statistic
  (d) => {
    if (d.strengths.length > 0 || d.statistics.length > 0) {
      const stat = d.statistics[0] || d.strengths[0];
      return `${stat} — this is not just a number. This is the reality we must address in this committee.`;
    }
    return `In an era where technology advances faster than our laws can keep up, we face a fundamental question: who protects the rights of the individual in the digital age?`;
  },
  // Rhetorical question
  (d) => {
    const topics = d.hotTopics.slice(0, 2).join(' and ').toLowerCase();
    if (topics) {
      return `Can we truly claim to champion human rights when ${topics} remain unregulated and unchecked? This committee must answer that question.`;
    }
    return `How many more people must have their fundamental rights violated before this council takes meaningful action?`;
  },
  // Real-world example
  (d) => {
    if (d.currentAffairs.length > 0) {
      const affair = d.currentAffairs[0];
      return `When ${affair.title}, the world watched. Yet today, we still lack the frameworks to prevent the next crisis.`;
    }
    return `From the streets of our capitals to the screens in our pockets — digital surveillance has woven itself into the fabric of modern life, and we must decide where to draw the line.`;
  },
  // Impactful statement
  (d) => {
    if (d.importance) {
      return `${d.importance} relevance. That is not a badge of honour — it is a call to action. The time for debate is over; the time for resolution is now.`;
    }
    return `The digital revolution was supposed to liberate us. Instead, it has created new tools for oppression, new avenues for discrimination, and new questions we have yet to answer.`;
  },
  // International event
  (d) => {
    if (d.currentAffairs.length > 0) {
      const aff = d.currentAffairs[0];
      return `The events surrounding ${aff.title.toLowerCase()} have demonstrated, beyond any doubt, that the international community cannot afford to remain silent.`;
    }
    return `Every day, millions of people go online unaware that their data is being collected, their movements tracked, and their private lives commodified. This is the human rights crisis of our generation.`;
  },
  // Short impactful
  () => {
    return `The right to privacy is not a privilege — it is a fundamental human right, enshrined in Article 12 of the Universal Declaration. Yet today, that right is under assault as never before.`;
  },
  // Country-specific hook
  (d) => {
    if (d.weaknesses.length > 0) {
      return `We cannot ignore the uncomfortable truth: ${d.weaknesses[0].toLowerCase()}. But rather than assign blame, we must work collectively to find solutions.`;
    }
    return `Technology knows no borders — and neither should our commitment to protecting human rights in the digital sphere.`;
  },
];

// ── Stance Templates ──

const stanceTemplates: ((data: CountryData) => string)[] = [
  (d) => `${d.name} firmly believes that ${d.officialPosition[0]?.toLowerCase() || 'the protection of human rights must guide our approach to digital governance'}. As ${d.isP5 ? 'a permanent member of the Security Council and' : ''} a committed member of this council, we assert that ${d.nationalInterests[0]?.toLowerCase() || 'our shared responsibility is to balance innovation with fundamental rights'}.`,
  (d) => `As ${d.government ? `a ${d.government.toLowerCase()}` : 'a sovereign nation'}, ${d.name} approaches this agenda with clarity of purpose. Our position is clear: ${d.officialPosition[1]?.toLowerCase() || d.officialPosition[0]?.toLowerCase() || 'human rights must be protected in the digital age'}.`,
  (d) => `${d.name} comes to this committee with a message of both urgency and responsibility. We recognize the immense potential of technology, but we also understand its dangers. That is why ${d.officialPosition[0]?.toLowerCase() || 'we advocate for balanced, human-centric digital governance'}.`,
];

// ── Evidence Builders ──

const evidenceBuilders: ((data: CountryData) => string[])[] = [
  (d) => {
    const facts: string[] = [];
    if (d.strengths.length >= 2) {
      facts.push(`${d.name} notes that ${d.strengths[0].toLowerCase()}.`);
      facts.push(`Furthermore, ${d.strengths[1].toLowerCase()}.`);
    } else if (d.strengths.length === 1) {
      facts.push(`${d.name} highlights that ${d.strengths[0].toLowerCase()}.`);
    }
    if (d.currentAffairs.length > 0) {
      const aff = d.currentAffairs[0];
      facts.push(`Recent developments, including ${aff.title.toLowerCase()}, underscore the urgency of this debate — ${aff.details[0]?.toLowerCase() || 'the implications are far-reaching'}.`);
    }
    return facts;
  },
  (d) => {
    const facts: string[] = [];
    if (d.currentAffairs.length > 0) {
      const aff = d.currentAffairs[0];
      facts.push(`As demonstrated by ${aff.title.toLowerCase()}, the intersection of technology and human rights demands immediate attention. ${aff.details[1] || aff.details[0] || ''}`);
    }
    if (d.hotTopics.length >= 2) {
      facts.push(`${d.name} draws the committee's attention to pressing concerns such as ${d.hotTopics[0].toLowerCase()} and ${d.hotTopics[1].toLowerCase()}.`);
    }
    if (d.defencePoints.length > 0) {
      facts.push(`In our assessment, ${d.defencePoints[0].toLowerCase()}.`);
    }
    return facts.filter(f => f.length > 10);
  },
  (d) => {
    const facts: string[] = [];
    if (d.officialPosition.length >= 2) {
      facts.push(`${d.name} reiterates that ${d.officialPosition[0].toLowerCase()}.`);
      facts.push(`Consistent with this principle, we maintain that ${d.officialPosition[1].toLowerCase()}.`);
    }
    if (d.defencePoints.length > 0) {
      facts.push(`Furthermore, ${d.defencePoints[0].toLowerCase()}.`);
    }
    return facts;
  },
];

// ── Solution Builders ──

const solutionBuilders: ((data: CountryData) => string[])[] = [
  (d) => {
    const solutions: string[] = [];
    if (d.resolutionIdeas.length >= 2) {
      solutions.push(`We propose the establishment of ${d.resolutionIdeas[0].toLowerCase()}.`);
      solutions.push(`Additionally, we call for ${d.resolutionIdeas[1].toLowerCase()}.`);
    } else if (d.resolutionIdeas.length === 1) {
      solutions.push(`We call for ${d.resolutionIdeas[0].toLowerCase()}.`);
    } else {
      solutions.push('We call for a comprehensive international framework that respects both national sovereignty and universal human rights standards.');
      solutions.push('We propose the creation of an independent oversight mechanism to ensure accountability in the deployment of surveillance technologies.');
    }
    if (d.allies.length > 0) {
      solutions.push(`${d.name} invites fellow Member States, particularly ${d.allies.slice(0, 2).join(' and ')}, to join us in developing these proposals.`);
    }
    return solutions;
  },
  (d) => {
    const solutions: string[] = [];
    solutions.push(`${d.name} recommends the adoption of binding international standards for ${d.hotTopics[0]?.toLowerCase() || 'the ethical deployment of artificial intelligence in public services'}.`);
    if (d.resolutionIdeas.length > 0) {
      solutions.push(`We further propose ${d.resolutionIdeas[d.resolutionIdeas.length - 1].toLowerCase()}.`);
    }
    if (d.nationalInterests.length > 0) {
      solutions.push(`Crucially, any framework must ${d.nationalInterests[0].toLowerCase()}.`);
    }
    return solutions;
  },
];

// ── Call to Action Templates ──

const callToActionTemplates: ((data: CountryData) => string)[] = [
  (d) => `${d.name} urges all delegations to set aside narrow national interests and work towards a framework that protects the rights of every individual. The world is watching, and history will judge us not by our words, but by our actions. We look forward to collaborating with all Member States to achieve a resolution worthy of this council's mandate.`,
  (d) => `In conclusion, ${d.name} reiterates its commitment to constructive dialogue and meaningful cooperation. The challenges before us are complex, but together, we can build a digital future that upholds the dignity and rights of all people. Let us seize this opportunity.`,
  (d) => `${d.name} calls on every delegation here today to choose cooperation over division, and action over rhetoric. The people we represent expect nothing less. We stand ready to work with all partners to craft a resolution that is ambitious, practical, and grounded in the principles of the Universal Declaration of Human Rights.`,
  (d) => `The path forward requires courage — the courage to regulate, the courage to cooperate, and the courage to put human rights above all else. ${d.name} is ready to take that path. We invite every delegation to join us.`,
];

// ── Length Configuration ──

const lengthConfig: Record<SpeechLength, { paragraphs: number; factsCount: number; solutionsCount: number; detail: 'minimal' | 'moderate' | 'full' }> = {
  '60': { paragraphs: 3, factsCount: 1, solutionsCount: 1, detail: 'minimal' },
  '90': { paragraphs: 4, factsCount: 2, solutionsCount: 2, detail: 'moderate' },
  '120': { paragraphs: 5, factsCount: 3, solutionsCount: 2, detail: 'full' },
};

// ── Speech Builder ──

function pick<T>(arr: T[], seed?: number): T {
  const idx = seed !== undefined ? Math.abs(seed) % arr.length : Math.floor(Math.random() * arr.length);
  return arr[idx];
}

function estimateTime(text: string): string {
  const words = text.split(/\s+/).length;
  const seconds = Math.round((words / 150) * 60);
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')} (${words} words)`;
}

// ── Main Generator ──

let generationCounter = 0;

export function generateGslSpeech(
  file: MunFile,
  committee: string,
  agenda: string,
  length: SpeechLength = '90',
  variationSeed?: number
): GslOutput {
  generationCounter++;
  const seed = variationSeed ?? generationCounter;

  const data = extractCountryData(file, committee, agenda);
  const config = lengthConfig[length];

  // Pick templates based on seed for variation
  const hookFn = pick(hookTemplates, seed);
  const stanceFn = pick(stanceTemplates, seed + 1);
  const evidenceFn = pick(evidenceBuilders, seed + 2);
  const solutionFn = pick(solutionBuilders, seed + 3);
  const callToActionFn = pick(callToActionTemplates, seed + 4);

  // Generate hook
  const hook = hookFn(data);
  const hookType = getHookTypeDescription(hookFn);

  // Generate stance
  const stance = stanceFn(data);

  // Generate evidence
  const evidenceItems = evidenceFn(data).slice(0, config.factsCount + 1);
  const keyFacts = evidenceItems.map(e => e.replace(/^(.*?:\s*)?/, '').replace(/\.$/, '').trim());

  // Generate solutions
  const solutionItems = solutionFn(data).slice(0, config.solutionsCount);
  const solutionsMentioned = solutionItems.map(s => s.replace(/^(We propose|We call for|We further propose|Additionally, we call for|Crucially,|Furthermore,)\s*/i, '').replace(/\.$/, '').trim());

  // Generate call to action
  const cta = callToActionFn(data);

  // Build speech paragraphs
  const paragraphs: string[] = [];

  // Hook paragraph
  paragraphs.push(hook);

  // Stance paragraph
  paragraphs.push(stance);

  // Evidence paragraph(s)
  if (evidenceItems.length > 0) {
    paragraphs.push(evidenceItems.join(' '));
  }

  // Solutions paragraph
  if (solutionItems.length > 0) {
    paragraphs.push(solutionItems.join(' '));
  }

  // Call to action
  paragraphs.push(cta);

  // Assemble speech
  const speech = paragraphs.join('\n\n');

  // Determine estimated time
  const estimatedTime = estimateTime(speech);

  return {
    speech,
    meta: {
      hook: hookType,
      countryPosition: data.officialPosition[0] || `${data.name} advocates for balanced digital governance.`,
      keyFactsUsed: keyFacts.slice(0, config.factsCount),
      solutionsMentioned: solutionsMentioned.slice(0, config.solutionsCount),
      estimatedTime,
    },
  };
}

function getHookTypeDescription(hookFn: (data: CountryData) => string): string {
  const idx = hookTemplates.indexOf(hookFn);
  const types = [
    'Shocking Statistic / Key Fact',
    'Rhetorical Question',
    'Real-World Example',
    'Impactful Statement',
    'Recent International Event',
    'Short Impactful Statement',
    'Country-Specific Challenge',
  ];
  return types[idx] || 'Impactful Opening';
}

// ── Committee/Agenda Lookup ──

export function getCommitteeAgenda(committee: string): string {
  if (committee === 'UNHRC') {
    return 'Human Rights Implications of Artificial Intelligence, Mass Digital Surveillance, and Data Privacy';
  }
  if (committee === 'UNSC') {
    return 'Global Supply Chain Security and Maritime Trade Resilience';
  }
  return 'General Debate';
}
