import { NextRequest, NextResponse } from 'next/server';
import { unifiedSearch } from '@/lib/search/unified';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivityServer } from '@/lib/activity-logger-server';
import { checkAccess, trackUsage } from '@/lib/feature-gate';
import type { UnifiedSearchResult } from '@/types/paper';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Feature gate: search usage limit
  const access = await checkAccess(userId, 'search');
  if (!access.allowed) return access.error!;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const sources = searchParams.get('sources')?.split(',');
  const yearFrom = searchParams.get('yearFrom') ? parseInt(searchParams.get('yearFrom')!) : undefined;
  const yearTo = searchParams.get('yearTo') ? parseInt(searchParams.get('yearTo')!) : undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const { results, total, errors } = await unifiedSearch(query, {
      sources,
      limit,
      yearFrom,
      yearTo,
    });

    // Cache results in papers table
    const supabase = createServiceClient();
    const cachedResults = await cachePapers(supabase, results, userId);

    // Save search history
    await supabase.from('search_history').insert({
      user_id: userId,
      query,
      source: (sources || ['semantic_scholar', 'openalex', 'cinii']).join(','),
      result_count: results.length,
    });

    // Log activity (fire-and-forget)
    logActivityServer(userId, 'search', 'search', undefined, {
      query,
      sources: sources || ['semantic_scholar', 'openalex', 'cinii'],
      result_count: results.length,
      year_from: yearFrom,
      year_to: yearTo,
    });

    // Track search usage
    await trackUsage(userId, 'search');

    return NextResponse.json({
      data: cachedResults,
      total,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function cachePapers(
  supabase: ReturnType<typeof createServiceClient>,
  results: UnifiedSearchResult[],
  userId: string
) {
  const cachedResults = [];

  for (const result of results) {
    // Try to find existing paper by DOI
    let existingPaper = null;
    if (result.doi) {
      const { data } = await supabase
        .from('papers')
        .select('*')
        .eq('user_id', userId)
        .eq('doi', result.doi)
        .single();
      existingPaper = data;
    }

    if (existingPaper) {
      cachedResults.push({ ...result, db_id: existingPaper.id });
    } else {
      // Insert new paper
      const { data: newPaper } = await supabase
        .from('papers')
        .insert({
          user_id: userId,
          semantic_scholar_id: result.semantic_scholar_id || null,
          openalex_id: result.openalex_id || null,
          doi: result.doi || null,
          cinii_id: result.cinii_id || null,
          title: result.title,
          title_ja: result.title_ja || null,
          abstract: result.abstract || null,
          authors: result.authors,
          year: result.year || null,
          venue: result.venue || null,
          citation_count: result.citation_count,
          reference_count: result.reference_count,
          is_open_access: result.is_open_access,
          pdf_url: result.pdf_url || null,
          fields_of_study: result.fields_of_study || null,
        })
        .select()
        .single();

      cachedResults.push({ ...result, db_id: newPaper?.id });
    }
  }

  return cachedResults;
}
