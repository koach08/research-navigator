import { NextRequest, NextResponse } from 'next/server';
import { checkOpenAccess } from '@/lib/api-clients/unpaywall';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { doi, paper_id } = await request.json();

  if (!doi) {
    return NextResponse.json({ error: 'DOI is required' }, { status: 400 });
  }

  const result = await checkOpenAccess(doi);

  // Update paper record if paper_id provided
  if (paper_id) {
    const supabase = createServiceClient();
    await supabase
      .from('papers')
      .update({
        is_open_access: result.is_open_access,
        pdf_url: result.pdf_url || null,
        access_status: result.is_open_access ? 'open' : 'closed',
      })
      .eq('id', paper_id)
      .eq('user_id', userId);
  }

  return NextResponse.json({ data: result });
}
