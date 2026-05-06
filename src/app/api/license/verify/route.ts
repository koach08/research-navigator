import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateGumroadKey, getUserPlan, getUsageCount, PLAN_LIMITS } from '@/lib/license';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const plan = await getUserPlan(userId);
  const searchUsed = await getUsageCount(userId, 'search');

  const supabase = createServiceClient();
  const { data: license } = await supabase
    .from('user_licenses')
    .select('activated_at, license_key')
    .eq('user_id', userId)
    .single();

  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return NextResponse.json({
    plan,
    isPro: plan === 'pro',
    activatedAt: license?.activated_at ?? null,
    hasKey: !!license?.license_key,
    usage: {
      search: {
        used: searchUsed,
        limit: PLAN_LIMITS[plan].search_per_month,
      },
      projects: {
        used: projectCount ?? 0,
        limit: PLAN_LIMITS[plan].max_projects,
      },
    },
  });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { licenseKey } = body;

  if (!licenseKey) {
    return NextResponse.json({ error: 'License key is required' }, { status: 400 });
  }

  const result = await validateGumroadKey(licenseKey);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('user_licenses')
    .upsert({
      user_id: userId,
      license_key: licenseKey,
      gumroad_purchase_id: result.purchaseId,
      plan: 'pro',
      is_active: true,
      activated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    return NextResponse.json({ error: 'Failed to save license' }, { status: 500 });
  }

  return NextResponse.json({ success: true, plan: 'pro' });
}

export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  await supabase
    .from('user_licenses')
    .update({ is_active: false })
    .eq('user_id', userId);

  return NextResponse.json({ success: true, plan: 'free' });
}
