import { NextRequest, NextResponse } from 'next/server';
import { generateSummary } from '@/lib/ai/client';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivityServer } from '@/lib/activity-logger-server';

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { abstract, title, paper_id } = await request.json();

  if (!abstract || !title) {
    return NextResponse.json({ error: 'Title and abstract are required' }, { status: 400 });
  }

  try {
    const summary = await generateSummary(abstract, title);

    if (!summary) {
      return NextResponse.json(
        { error: 'AI summarization failed. Check your ANTHROPIC_API_KEY.' },
        { status: 500 }
      );
    }

    // Update paper record if paper_id provided
    if (paper_id) {
      const supabase = createServiceClient();
      await supabase
        .from('papers')
        .update({
          ai_summary_ja: summary.summary_ja,
          ai_summary_en: summary.summary_en,
          ai_key_findings: summary.key_findings,
        })
        .eq('id', paper_id)
        .eq('user_id', userId);
    }

    // Log activity (fire-and-forget)
    logActivityServer(userId, 'summarize', 'paper', paper_id || undefined, {
      title,
    });

    return NextResponse.json({ data: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Summarization failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
