import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');

  const supabase = createServiceClient();

  // Get papers for this project
  let paperIds: string[] = [];

  if (projectId) {
    const { data: projectPapers } = await supabase
      .from('project_papers')
      .select('paper_id')
      .eq('project_id', projectId);
    paperIds = (projectPapers || []).map(pp => pp.paper_id);
  } else {
    const { data: allPapers } = await supabase
      .from('papers')
      .select('id')
      .eq('user_id', userId);
    paperIds = (allPapers || []).map(p => p.id);
  }

  if (paperIds.length === 0) {
    return NextResponse.json({ data: { nodes: [], edges: [] } });
  }

  // Get papers
  const { data: papers } = await supabase
    .from('papers')
    .select('id, title, year, citation_count, authors, semantic_scholar_id, is_open_access, doi, venue')
    .in('id', paperIds);

  // Get all edges where either citing or cited is in our paper set
  const { data: edges } = await supabase
    .from('citation_edges')
    .select('citing_paper_id, cited_paper_id, context_type')
    .eq('user_id', userId)
    .or(`citing_paper_id.in.(${paperIds.join(',')}),cited_paper_id.in.(${paperIds.join(',')})`);

  // Also get papers referenced by edges that aren't in our set
  const edgePaperIds = new Set<string>();
  for (const edge of edges || []) {
    edgePaperIds.add(edge.citing_paper_id);
    edgePaperIds.add(edge.cited_paper_id);
  }
  const missingIds = [...edgePaperIds].filter(id => !paperIds.includes(id));

  let additionalPapers: typeof papers = [];
  if (missingIds.length > 0) {
    const { data } = await supabase
      .from('papers')
      .select('id, title, year, citation_count, authors, semantic_scholar_id, is_open_access, doi, venue')
      .in('id', missingIds);
    additionalPapers = data || [];
  }

  const allNodes = [...(papers || []), ...additionalPapers];

  // Format for D3
  const nodes = allNodes.map(p => ({
    id: p.id,
    title: p.title,
    year: p.year,
    citation_count: p.citation_count,
    authors: p.authors,
    is_open_access: p.is_open_access,
    doi: p.doi,
    venue: p.venue,
    in_project: paperIds.includes(p.id),
  }));

  const graphEdges = (edges || []).map(e => ({
    source: e.citing_paper_id,
    target: e.cited_paper_id,
    context_type: e.context_type,
  }));

  return NextResponse.json({
    data: { nodes, edges: graphEdges },
  });
}
