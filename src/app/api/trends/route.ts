import { NextRequest, NextResponse } from 'next/server';

const OPENALEX_BASE = 'https://api.openalex.org';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic');
  const years = parseInt(searchParams.get('years') || '5');

  if (!topic) {
    return NextResponse.json({ error: 'topic parameter required' }, { status: 400 });
  }

  const mailto = process.env.OPENALEX_EMAIL;
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - years;

  try {
    // 1. Year-by-year publication counts
    const yearCounts: { year: number; count: number }[] = [];
    for (let y = startYear; y <= currentYear; y++) {
      const url = `${OPENALEX_BASE}/works?search=${encodeURIComponent(topic)}&filter=publication_year:${y}&per_page=1${mailto ? `&mailto=${encodeURIComponent(mailto)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        yearCounts.push({ year: y, count: data.meta?.count || 0 });
      }
    }

    // 2. Top cited recent papers (last 3 years)
    const recentUrl = `${OPENALEX_BASE}/works?search=${encodeURIComponent(topic)}&filter=from_publication_date:${currentYear - 2}-01-01&sort=cited_by_count:desc&per_page=10${mailto ? `&mailto=${encodeURIComponent(mailto)}` : ''}`;
    const recentRes = await fetch(recentUrl);
    const recentData = recentRes.ok ? await recentRes.json() : { results: [] };

    const topPapers = (recentData.results || []).map((w: Record<string, unknown>) => {
      const authorships = w.authorships as Array<{ author: { display_name: string } }> | undefined;
      const openAccess = w.open_access as { is_oa: boolean; oa_url?: string } | undefined;
      const primaryLocation = w.primary_location as { source?: { display_name?: string } } | undefined;
      const doi = (w.doi as string)?.replace('https://doi.org/', '');
      return {
        title: w.title || w.display_name,
        year: w.publication_year,
        cited_by_count: w.cited_by_count || 0,
        doi,
        authors: (authorships || []).slice(0, 3).map(
          (a: { author: { display_name: string } }) => a.author.display_name
        ),
        is_open_access: openAccess?.is_oa || false,
        oa_url: openAccess?.oa_url,
        venue: primaryLocation?.source?.display_name,
      };
    });

    // 3. Related concepts/topics
    const conceptsUrl = `${OPENALEX_BASE}/works?search=${encodeURIComponent(topic)}&per_page=50${mailto ? `&mailto=${encodeURIComponent(mailto)}` : ''}`;
    const conceptsRes = await fetch(conceptsUrl);
    const conceptsData = conceptsRes.ok ? await conceptsRes.json() : { group_by: [] };

    // Extract concepts from results
    const conceptCounts: Record<string, number> = {};
    for (const work of conceptsData.results || []) {
      for (const concept of (work.concepts || []).slice(0, 5)) {
        const name = concept.display_name;
        conceptCounts[name] = (conceptCounts[name] || 0) + 1;
      }
    }

    const relatedTopics = Object.entries(conceptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));

    // 4. Growth rate calculation
    const recentYears = yearCounts.slice(-3);
    const olderYears = yearCounts.slice(0, -3);
    const recentAvg = recentYears.length > 0
      ? recentYears.reduce((s, y) => s + y.count, 0) / recentYears.length
      : 0;
    const olderAvg = olderYears.length > 0
      ? olderYears.reduce((s, y) => s + y.count, 0) / olderYears.length
      : 1;
    const growthRate = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;

    return NextResponse.json({
      data: {
        topic,
        year_counts: yearCounts,
        growth_rate: growthRate,
        top_papers: topPapers,
        related_topics: relatedTopics,
        total_recent: recentData.meta?.count || 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Trend analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
