export interface NewsItem {
  id: number | string;
  titulo: string;
  fonte: string;
  resumo: string;
  conteudo: string; // Used for the full report/clipboard
  link: string;
  originalLink?: string;
  data: string; // Format: YYYY-MM-DD
  isShortening?: boolean;
}

export interface BotResultItem {
  id: string;
  title: string;
  link: string;
  pubDate: string; // YYYY-MM-DD
  sortableDate: Date;
  pubDateDisplay: string;
  source: string;
  snippet: string;
}

export interface FormDataState {
  titulo: string;
  fonte: string;
  resumo: string;
  conteudo: string;
  link: string;
  data: string;
}

export interface AISummaryResponse {
  titulo: string;
  fonte: string;
  resumo: string;
  data: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface GroundingSearchResult {
  text: string;
  sources: GroundingSource[];
}