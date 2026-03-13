import type { SearchResult, Author } from '@/types/paper';

const BASE_URL = 'https://api.openalex.org';

function getMailto(): string {
  return process.env.OPENALEX_EMAIL || '';
}

interface OAAuthorship {
  author: { display_name: string; id?: string };
}

interface OAWork {
  id: string;
  doi?: string;
  title?: string;
  display_name?: string;
  publication_year?: number;
  abstract_inverted_index?: Record<string, number[]>;
  authorships?: OAAuthorship[];
  cited_by_count?: number;
  referenced_works_count?: number;
  open_access?: { is_oa: boolean; oa_url?: string };
  primary_location?: { source?: { display_name?: string } };
  concepts?: { display_name: string }[];
}

function reconstructAbstract(invertedIndex: Record<string, number[]> | undefined): string | undefined {
  if (!invertedIndex) return undefined;
  const words: [string, number][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([word, pos]);
    }
  }
  words.sort((a, b) => a[1] - b[1]);
  return words.map(([word]) => word).join(' ');
}

function mapWork(work: OAWork): SearchResult {
  const doi = work.doi?.replace('https://doi.org/', '') || undefined;
  return {
    source: 'openalex',
    openalex_id: work.id.replace('https://openalex.org/', ''),
    doi,
    title: work.title || work.display_name || 'Untitled',
    abstract: reconstructAbstract(work.abstract_inverted_index),
    authors: (work.authorships || []).map((a: OAAuthorship): Author => ({
      name: a.author.display_name,
    })),
    year: work.publication_year,
    venue: work.primary_location?.source?.display_name,
    citation_count: work.cited_by_count || 0,
    reference_count: work.referenced_works_count || 0,
    is_open_access: work.open_access?.is_oa || false,
    pdf_url: work.open_access?.oa_url,
    fields_of_study: work.concepts?.slice(0, 5).map((c: { display_name: string }) => c.display_name),
  };
}

export async function searchOpenAlex(
  query: string,
  options: { limit?: number; yearFrom?: number; yearTo?: number } = {}
): Promise<{ results: SearchResult[]; total: number }> {
  const { limit = 20, yearFrom, yearTo } = options;

  let url = `${BASE_URL}/works?search=${encodeURIComponent(query)}&per_page=${limit}`;

  const mailto = getMailto();
  if (mailto) url += `&mailto=${encodeURIComponent(mailto)}`;

  const filters: string[] = [];
  if (yearFrom) filters.push(`from_publication_date:${yearFrom}-01-01`);
  if (yearTo) filters.push(`to_publication_date:${yearTo}-12-31`);
  if (filters.length > 0) url += `&filter=${filters.join(',')}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenAlex API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    results: (data.results || []).map(mapWork),
    total: data.meta?.count || 0,
  };
}
