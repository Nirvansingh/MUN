export interface MunFile {
  path: string;
  name: string;
  displayName: string;
  committee: string;
  category: string;
  content: string;
  isCountry: boolean;
  parts: string[];
}

export interface CountryInfo {
  officialName?: string;
  capital?: string;
  government?: string;
  leader?: string;
  importance?: string;
  unscStatus?: string;
  allies?: string;
  opponents?: string;
}

export interface MyCountry {
  name: string;
  committee: string;
}

export interface SearchResult {
  file: MunFile;
  relevance: number;
  matches: { lineNum: number; text: string }[];
}
