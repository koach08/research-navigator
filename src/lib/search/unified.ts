import type { SearchResult, UnifiedSearchResult } from '@/types/paper';
import { searchSemanticScholar } from '@/lib/api-clients/semantic-scholar';
import { searchOpenAlex } from '@/lib/api-clients/openalex';
import { searchCiNii } from '@/lib/api-clients/cinii';

interface UnifiedSearchOptions {
  sources?: string[];
  limit?: number;
  offset?: number;
  yearFrom?: number;
  yearTo?: number;
}

function deduplicateByDoi(results: SearchResult[]): UnifiedSearchResult[] {
  const doiMap = new Map<string, UnifiedSearchResult>();
  const noDoi: UnifiedSearchResult[] = [];

  for (const result of results) {
    if (result.doi) {
      const normalizedDoi = result.doi.toLowerCase().trim();
      const existing = doiMap.get(normalizedDoi);

      if (existing) {
        existing.sources.push(result.source);
        existing.merged = true;
        // Prefer Semantic Scholar data (more detailed)
        if (result.source === 'semantic_scholar') {
          existing.semantic_scholar_id = result.semantic_scholar_id;
          existing.abstract = result.abstract || existing.abstract;
          existing.citation_count = Math.max(existing.citation_count, result.citation_count);
          existing.reference_count = Math.max(existing.reference_count, result.reference_count);
          existing.tldr = result.tldr || existing.tldr;
          existing.fields_of_study = result.fields_of_study || existing.fields_of_study;
        }
        if (result.source === 'openalex') {
          existing.openalex_id = result.openalex_id;
        }
        if (result.source === 'cinii') {
          existing.cinii_id = result.cinii_id;
          existing.title_ja = result.title_ja || existing.title_ja;
        }
        // Merge OA info
        if (result.is_open_access) {
          existing.is_open_access = true;
          existing.pdf_url = existing.pdf_url || result.pdf_url;
        }
      } else {
        doiMap.set(normalizedDoi, {
          ...result,
          sources: [result.source],
          merged: false,
        });
      }
    } else {
      noDoi.push({
        ...result,
        sources: [result.source],
        merged: false,
      });
    }
  }

  return [...doiMap.values(), ...noDoi];
}

export async function unifiedSearch(
  query: string,
  options: UnifiedSearchOptions = {}
): Promise<{ results: UnifiedSearchResult[]; total: number; errors: string[] }> {
  const {
    sources = ['semantic_scholar', 'openalex', 'cinii'],
    limit = 20,
    offset = 0,
    yearFrom,
    yearTo,
  } = options;

  const searchPromises: Promise<{ source: string; results: SearchResult[]; total: number }>[] = [];

  if (sources.includes('semantic_scholar')) {
    searchPromises.push(
      searchSemanticScholar(query, { limit, offset, yearFrom, yearTo })
        .then(r => ({ source: 'semantic_scholar', ...r }))
    );
  }

  if (sources.includes('openalex')) {
    searchPromises.push(
      searchOpenAlex(query, { limit, yearFrom, yearTo })
        .then(r => ({ source: 'openalex', ...r }))
    );
  }

  if (sources.includes('cinii')) {
    searchPromises.push(
      searchCiNii(query, { limit, yearFrom, yearTo })
        .then(r => ({ source: 'cinii', ...r }))
    );
  }

  const settled = await Promise.allSettled(searchPromises);

  const allResults: SearchResult[] = [];
  const errors: string[] = [];
  let totalEstimate = 0;

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value.results);
      totalEstimate += result.value.total;
    } else {
      errors.push(result.reason?.message || 'Unknown error');
    }
  }

  const deduplicated = deduplicateByDoi(allResults);

  // Sort by citation count (descending) then year (descending)
  deduplicated.sort((a, b) => {
    const citeDiff = b.citation_count - a.citation_count;
    if (citeDiff !== 0) return citeDiff;
    return (b.year || 0) - (a.year || 0);
  });

  return {
    results: deduplicated,
    total: totalEstimate,
    errors,
  };
}
