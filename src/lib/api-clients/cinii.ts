import type { SearchResult } from '@/types/paper';

const BASE_URL = 'https://cir.nii.ac.jp/opensearch/articles';

interface CiNiiItem {
  '@id'?: string;
  'dc:title'?: Array<{ '@value': string; '@language'?: string }>;
  'dc:creator'?: Array<{ '@value': string }>;
  'prism:publicationDate'?: string;
  'prism:publicationName'?: string;
  'dc:description'?: Array<{ '@value': string }>;
  'prism:doi'?: string;
  'opensearch:totalResults'?: number;
}

function mapItem(item: CiNiiItem): SearchResult {
  const titles = item['dc:title'] || [];
  const titleEn = titles.find(t => t['@language'] === 'en')?.['@value'];
  const titleJa = titles.find(t => t['@language'] === 'ja')?.['@value'];
  const title = titleEn || titleJa || 'Untitled';

  const id = item['@id'] || '';
  const ciniiId = id.replace('https://cir.nii.ac.jp/crid/', '');

  const descriptions = item['dc:description'] || [];
  const abstract = descriptions[0]?.['@value'];

  const year = item['prism:publicationDate']
    ? parseInt(item['prism:publicationDate'].slice(0, 4))
    : undefined;

  return {
    source: 'cinii',
    cinii_id: ciniiId,
    doi: item['prism:doi'] || undefined,
    title,
    title_ja: titleJa,
    abstract,
    authors: (item['dc:creator'] || []).map(a => ({ name: a['@value'] })),
    year: isNaN(year as number) ? undefined : year,
    venue: item['prism:publicationName'] || undefined,
    citation_count: 0,
    reference_count: 0,
    is_open_access: false,
  };
}

export async function searchCiNii(
  query: string,
  options: { limit?: number; yearFrom?: number; yearTo?: number } = {}
): Promise<{ results: SearchResult[]; total: number }> {
  const apiKey = process.env.CINII_API_KEY;
  if (!apiKey) {
    return { results: [], total: 0 };
  }

  const { limit = 20, yearFrom, yearTo } = options;

  let url = `${BASE_URL}?q=${encodeURIComponent(query)}&count=${limit}&format=json&appid=${apiKey}`;

  if (yearFrom) url += `&from=${yearFrom}`;
  if (yearTo) url += `&until=${yearTo}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CiNii API error: ${res.status}`);
  }

  const data = await res.json();
  const graph = data['@graph'] || [];

  // First item contains metadata, rest are results
  const totalResults = graph[0]?.['opensearch:totalResults'] || 0;
  const items = graph.slice(1) as CiNiiItem[];

  return {
    results: items.map(mapItem),
    total: typeof totalResults === 'string' ? parseInt(totalResults) : totalResults,
  };
}
