import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Export all user data
  const [projectsRes, papersRes, projectPapersRes, edgesRes, monitorsRes, historyRes, activityRes] = await Promise.all([
    supabase.from('projects').select('*').eq('user_id', userId),
    supabase.from('papers').select('*').eq('user_id', userId),
    supabase.from('project_papers').select('*').in(
      'project_id',
      (await supabase.from('projects').select('id').eq('user_id', userId)).data?.map(p => p.id) || []
    ),
    supabase.from('citation_edges').select('*').eq('user_id', userId),
    supabase.from('field_monitors').select('*').eq('user_id', userId),
    supabase.from('search_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    supabase.from('activity_log').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    projects: projectsRes.data || [],
    papers: papersRes.data || [],
    project_papers: projectPapersRes.data || [],
    citation_edges: edgesRes.data || [],
    field_monitors: monitorsRes.data || [],
    search_history: historyRes.data || [],
    activity_log: activityRes.data || [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="research-navigator-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
