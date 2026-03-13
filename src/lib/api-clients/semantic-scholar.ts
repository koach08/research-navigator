import type { SearchResult, Author } from '@/types/paper';

const BASE_URL = 'https://api.semanticscholar.org/graph/v1';
const FIELDS = 'paperId,title,abstract,year,authors,citationCount,referenceCount,isOpenAccess,openAccessPdf,fieldsOfStudy,tldr';

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  }
  return headers;
}

interface S2Author {
  authorId?: string;
  name: string;
}

interface S2Paper {
  paperId: string;
  title: string;
  abstract?: string;
  year?: number;
  authors?: S2Author[];
  citationCount?: number;
  referenceCount?: number;
  isOpenAccess?: boolean;
  openAccessPdf?: { url: string };
  fieldsOfStudy?: string[];
  tldr?: { text: string };
  externalIds?: { DOI?: string };
  venue?: string;
}

function mapPaper(paper: S2Paper): SearchResult {
  return {
    source: 'semantic_scholar',
    semantic_scholar_id: paper.paperId,
    doi: paper.externalIds?.DOI || undefined,
    title: paper.title,
    abstract: paper.abstract || undefined,
    authors: (paper.authors || []).map((a: S2Author): Author => ({
      name: a.name,
      authorId: a.authorId,
    })),
    year: paper.year,
    venue: paper.venue,
    citation_count: paper.citationCount || 0,
    reference_count: paper.referenceCount || 0,
    is_open_access: paper.isOpenAccess || false,
    pdf_url: paper.openAccessPdf?.url,
    fields_of_study: paper.fieldsOfStudy,
    tldr: paper.tldr?.text,
  };
}

export async function searchSemanticScholar(
  query: string,
  options: { limit?: number; offset?: number; yearFrom?: number; yearTo?: number } = {}
): Promise<{ results: SearchResult[]; total: number }> {
  const { limit = 20, offset = 0, yearFrom, yearTo } = options;

  let url = `${BASE_URL}/paper/search?query=${encodeURIComponent(query)}&fields=${FIELDS},externalIds,venue&limit=${limit}&offset=${offset}`;

  if (yearFrom || yearTo) {
    const from = yearFrom || 1900;
    const to = yearTo || new Date().getFullYear();
    url += `&year=${from}-${to}`;
  }

  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Semantic Scholar rate limit exceeded. Please wait a moment.');
    }
    throw new Error(`Semantic Scholar API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    results: (data.data || []).map(mapPaper),
    total: data.total || 0,
  };
}

export async function getPaperDetails(paperId: string): Promise<SearchResult | null> {
  const url = `${BASE_URL}/paper/${paperId}?fields=${FIELDS},externalIds,venue`;
  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) return null;

  const paper = await res.json();
  return mapPaper(paper);
}

export async function getPaperReferences(paperId: string, limit = 50): Promise<SearchResult[]> {
  const url = `${BASE_URL}/paper/${paperId}/references?fields=${FIELDS},externalIds,venue&limit=${limit}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.data || [])
    .filter((d: { citedPaper: S2Paper | null }) => d.citedPaper?.paperId)
    .map((d: { citedPaper: S2Paper }) => mapPaper(d.citedPaper));
}

export async function getPaperCitations(paperId: string, limit = 50): Promise<SearchResult[]> {
  const url = `${BASE_URL}/paper/${paperId}/citations?fields=${FIELDS},externalIds,venue&limit=${limit}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.data || [])
    .filter((d: { citingPaper: S2Paper | null }) => d.citingPaper?.paperId)
    .map((d: { citingPaper: S2Paper }) => mapPaper(d.citingPaper));
}
