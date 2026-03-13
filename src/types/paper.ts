export interface Author {
  name: string;
  authorId?: string;
}

export interface Paper {
  id: string;
  user_id: string;
  semantic_scholar_id?: string | null;
  openalex_id?: string | null;
  doi?: string | null;
  cinii_id?: string | null;
  title: string;
  title_ja?: string | null;
  abstract?: string | null;
  authors: Author[];
  year?: number | null;
  venue?: string | null;
  citation_count: number;
  reference_count: number;
  is_open_access: boolean;
  pdf_url?: string | null;
  access_status: string;
  ai_summary_ja?: string | null;
  ai_summary_en?: string | null;
  ai_key_findings?: string[] | null;
  ai_methodology?: string | null;
  ai_relevance_score?: number | null;
  fields_of_study?: string[] | null;
  topics?: string[] | null;
  fetched_at: string;
  created_at: string;
}

export interface SearchResult {
  source: 'semantic_scholar' | 'openalex' | 'cinii';
  semantic_scholar_id?: string;
  openalex_id?: string;
  cinii_id?: string;
  doi?: string;
  title: string;
  title_ja?: string;
  abstract?: string;
  authors: Author[];
  year?: number;
  venue?: string;
  citation_count: number;
  reference_count: number;
  is_open_access: boolean;
  pdf_url?: string;
  fields_of_study?: string[];
  tldr?: string;
}

export interface UnifiedSearchResult extends SearchResult {
  sources: string[];
  merged: boolean;
}

export type PaperStatus = 'unreviewed' | 'included' | 'excluded' | 'maybe';
export type ReadStatus = 'unread' | 'reading' | 'read';
export type CiteDecision = 'undecided' | 'will_cite' | 'wont_cite';

export interface ProjectPaper {
  id: string;
  project_id: string;
  paper_id: string;
  status: PaperStatus;
  read_status: ReadStatus;
  cite_decision: CiteDecision;
  priority: number;
  citation_context?: string | null;
  notes?: string | null;
  tags: string[];
  added_at: string;
  updated_at: string;
  paper?: Paper;
}
