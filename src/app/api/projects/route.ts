import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkAccess } from '@/lib/feature-gate';

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*, paper_count:project_papers(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten count
  const projects = (data || []).map(p => ({
    ...p,
    paper_count: p.paper_count?.[0]?.count || 0,
  }));

  return NextResponse.json({ data: projects });
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, field, color } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const access = await checkAccess(userId, 'project_create');
  if (!access.allowed) return access.error!;

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name,
      description: description || null,
      field: field || null,
      color: color || '#3B82F6',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
