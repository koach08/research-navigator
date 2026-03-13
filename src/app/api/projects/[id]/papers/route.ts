import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivityServer } from '@/lib/activity-logger-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('project_papers')
    .select('*, paper:papers(*)')
    .eq('project_id', id)
    .order('added_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = createServiceClient();
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { paper_id } = body;

  if (!paper_id) {
    return NextResponse.json({ error: 'paper_id is required' }, { status: 400 });
  }

  // Check if already added
  const { data: existing } = await supabase
    .from('project_papers')
    .select('id')
    .eq('project_id', projectId)
    .eq('paper_id', paper_id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Paper already in project' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('project_papers')
    .insert({
      project_id: projectId,
      paper_id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity (fire-and-forget)
  logActivityServer(userId, 'add_to_project', 'project', projectId, {
    paper_id,
  });

  return NextResponse.json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = createServiceClient();
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id: ppId, ...updates } = body;

  if (!ppId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const allowedFields = ['status', 'read_status', 'cite_decision', 'priority', 'citation_context', 'notes', 'tags'];
  const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      safeUpdates[field] = updates[field];
    }
  }

  const { data, error } = await supabase
    .from('project_papers')
    .update(safeUpdates)
    .eq('id', ppId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity for each type of update (fire-and-forget)
  if (updates.status !== undefined) {
    logActivityServer(userId, 'set_status', 'project', projectId, {
      project_paper_id: ppId,
      status: updates.status,
    });
  }
  if (updates.read_status !== undefined) {
    logActivityServer(userId, 'set_read_status', 'project', projectId, {
      project_paper_id: ppId,
      read_status: updates.read_status,
    });
  }
  if (updates.cite_decision !== undefined) {
    logActivityServer(userId, 'set_cite_decision', 'project', projectId, {
      project_paper_id: ppId,
      cite_decision: updates.cite_decision,
    });
  }

  return NextResponse.json({ data });
}
