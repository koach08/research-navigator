import { NextRequest, NextResponse } from 'next/server';
import { getPaperReferences, getPaperCitations } from '@/lib/api-clients/semantic-scholar';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivityServer } from '@/lib/activity-logger-server';

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paper_id, semantic_scholar_id, direction = 'both', depth = 1 } = await request.json();

  if (!semantic_scholar_id) {
    return NextResponse.json({ error: 'semantic_scholar_id is required' }, { status: 400 });
  }

  const maxDepth = Math.min(depth, 2); // Max 2 levels deep
  const supabase = createServiceClient();
  const visited = new Set<string>();
  const allEdges: { citing: string; cited: string }[] = [];
  const allPapers: Record<string, unknown> = {};

  async function expand(ssId: string, currentDepth: number) {
    if (currentDepth > maxDepth || visited.has(ssId)) return;
    visited.add(ssId);

    const promises = [];
    if (direction === 'both' || direction === 'references') {
      promises.push(
        getPaperReferences(ssId, 20).then(refs => {
          for (const ref of refs) {
            if (ref.semantic_scholar_id) {
              allEdges.push({ citing: ssId, cited: ref.semantic_scholar_id });
              allPapers[ref.semantic_scholar_id] = ref;
            }
          }
          return refs;
        })
      );
    }
    if (direction === 'both' || direction === 'citations') {
      promises.push(
        getPaperCitations(ssId, 20).then(cits => {
          for (const cit of cits) {
            if (cit.semantic_scholar_id) {
              allEdges.push({ citing: cit.semantic_scholar_id, cited: ssId });
              allPapers[cit.semantic_scholar_id] = cit;
            }
          }
          return cits;
        })
      );
    }

    await Promise.allSettled(promises);

    // Recurse for next level
    if (currentDepth < maxDepth) {
      const nextIds = Object.keys(allPapers).filter(id => !visited.has(id)).slice(0, 5);
      for (const nextId of nextIds) {
        await expand(nextId, currentDepth + 1);
      }
    }
  }

  try {
    await expand(semantic_scholar_id, 1);

    // Cache papers and edges in DB
    for (const [ssId, paperData] of Object.entries(allPapers)) {
      const p = paperData as Record<string, unknown>;
      const doi = p.doi as string | undefined;

      // Check if exists
      const { data: existing } = await supabase
        .from('papers')
        .select('id')
        .eq('user_id', userId)
        .eq('semantic_scholar_id', ssId)
        .single();

      if (!existing) {
        await supabase.from('papers').insert({
          user_id: userId,
          semantic_scholar_id: ssId,
          doi: doi || null,
          title: p.title as string,
          abstract: (p.abstract as string) || null,
          authors: p.authors || [],
          year: (p.year as number) || null,
          venue: (p.venue as string) || null,
          citation_count: (p.citation_count as number) || 0,
          reference_count: (p.reference_count as number) || 0,
          is_open_access: (p.is_open_access as boolean) || false,
          pdf_url: (p.pdf_url as string) || null,
          fields_of_study: (p.fields_of_study as string[]) || null,
        });
      }
    }

    // Store citation edges
    for (const edge of allEdges) {
      const { data: citingPaper } = await supabase
        .from('papers')
        .select('id')
        .eq('user_id', userId)
        .eq('semantic_scholar_id', edge.citing)
        .single();
      const { data: citedPaper } = await supabase
        .from('papers')
        .select('id')
        .eq('user_id', userId)
        .eq('semantic_scholar_id', edge.cited)
        .single();

      if (citingPaper && citedPaper) {
        await supabase.from('citation_edges').upsert({
          citing_paper_id: citingPaper.id,
          cited_paper_id: citedPaper.id,
          user_id: userId,
        }, { onConflict: 'citing_paper_id,cited_paper_id,user_id' });
      }
    }

    // Log activity (fire-and-forget)
    logActivityServer(userId, 'expand_citations', 'paper', paper_id || semantic_scholar_id, {
      semantic_scholar_id,
      direction,
      depth: maxDepth,
      papers_found: Object.keys(allPapers).length,
      edges_found: allEdges.length,
    });

    return NextResponse.json({
      data: {
        root: semantic_scholar_id,
        papers: Object.entries(allPapers).map(([id, p]) => ({ semantic_scholar_id: id, ...(p as object) })),
        edges: allEdges,
        stats: {
          papers_found: Object.keys(allPapers).length,
          edges_found: allEdges.length,
          depth: maxDepth,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Expansion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
