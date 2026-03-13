import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    // Fetch all activity logs for this user
    const { data: logs, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allLogs = logs || [];

    // Total counts by action type
    const totalSearches = allLogs.filter(l => l.action === 'search').length;
    const totalPapersAdded = allLogs.filter(l => l.action === 'add_to_project').length;
    const totalSummarized = allLogs.filter(l => l.action === 'summarize').length;
    const totalAdvisorQueries = allLogs.filter(l => l.action === 'advisor_query').length;
    const totalExpandCitations = allLogs.filter(l => l.action === 'expand_citations').length;

    // Papers reviewed: status changes + cite decisions + read status changes
    const reviewActions = ['set_status', 'set_cite_decision', 'set_read_status'];
    const totalPapersReviewed = allLogs.filter(l => reviewActions.includes(l.action)).length;

    // Most common search terms (from search action metadata)
    const searchTermCounts: Record<string, number> = {};
    allLogs
      .filter(l => l.action === 'search' && l.metadata?.query)
      .forEach(l => {
        const query = (l.metadata.query as string).toLowerCase().trim();
        searchTermCounts[query] = (searchTermCounts[query] || 0) + 1;
      });
    const topSearchTerms = Object.entries(searchTermCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }));

    // Include/exclude ratio (from set_cite_decision actions)
    const citeDecisions = allLogs.filter(l => l.action === 'set_cite_decision');
    const includeCount = citeDecisions.filter(l => l.metadata?.cite_decision === 'include').length;
    const excludeCount = citeDecisions.filter(l => l.metadata?.cite_decision === 'exclude').length;
    const includeExcludeRatio = excludeCount > 0
      ? Math.round((includeCount / excludeCount) * 100) / 100
      : includeCount > 0
        ? Infinity
        : 0;

    // Most active project (from add_to_project, set_status, etc.)
    const projectCounts: Record<string, number> = {};
    allLogs
      .filter(l => l.entity_type === 'project' && l.entity_id)
      .forEach(l => {
        projectCounts[l.entity_id!] = (projectCounts[l.entity_id!] || 0) + 1;
      });
    const mostActiveProjectId = Object.entries(projectCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    // Look up project name if we have a most active project
    let mostActiveProject: { id: string; name: string; activity_count: number } | null = null;
    if (mostActiveProjectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', mostActiveProjectId)
        .single();
      if (project) {
        mostActiveProject = {
          id: project.id,
          name: project.name,
          activity_count: projectCounts[mostActiveProjectId],
        };
      }
    }

    // Activity over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLogs = allLogs.filter(l => new Date(l.created_at) >= thirtyDaysAgo);

    const dailyActivity: Record<string, number> = {};
    recentLogs.forEach(l => {
      const date = new Date(l.created_at).toISOString().slice(0, 10);
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    // Fill in missing days with 0
    const activityOverTime: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      activityOverTime.push({
        date: dateStr,
        count: dailyActivity[dateStr] || 0,
      });
    }

    return NextResponse.json({
      data: {
        totals: {
          searches: totalSearches,
          papers_added: totalPapersAdded,
          papers_reviewed: totalPapersReviewed,
          summarized: totalSummarized,
          advisor_queries: totalAdvisorQueries,
          expand_citations: totalExpandCitations,
        },
        top_search_terms: topSearchTerms,
        include_exclude_ratio: {
          include: includeCount,
          exclude: excludeCount,
          ratio: includeExcludeRatio,
        },
        most_active_project: mostActiveProject,
        activity_over_time: activityOverTime,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get activity stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
