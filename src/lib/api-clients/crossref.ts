interface CrossRefWork {
  DOI: string;
  title?: string[];
  author?: { given?: string; family?: string }[];
  'published-print'?: { 'date-parts': number[][] };
  'published-online'?: { 'date-parts': number[][] };
  'container-title'?: string[];
  'is-referenced-by-count'?: number;
  'references-count'?: number;
}

export async function resolveDoiMetadata(doi: string): Promise<CrossRefWork | null> {
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.message as CrossRefWork;
  } catch {
    return null;
  }
}
