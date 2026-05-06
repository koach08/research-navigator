import { createServiceClient } from '@/lib/supabase/server';

export type Plan = 'free' | 'pro';

export const PLAN_LIMITS = {
  free: {
    search_per_month: 10,
    advisor: false,
    review: false,
    max_projects: 2,
    trend_edit: false,
    export: false,
  },
  pro: {
    search_per_month: Infinity,
    advisor: true,
    review: true,
    max_projects: Infinity,
    trend_edit: true,
    export: true,
  },
} as const;

const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID || 'YOUR_PRODUCT_ID';

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function validateGumroadKey(
  licenseKey: string
): Promise<{ valid: boolean; error?: string; purchaseId?: string }> {
  try {
    const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        product_id: GUMROAD_PRODUCT_ID,
        license_key: licenseKey,
        increment_uses_count: 'true',
      }),
    });

    const data = await res.json();

    if (data.success) {
      return { valid: true, purchaseId: data.purchase?.id };
    }
    return { valid: false, error: data.message || 'Invalid license key' };
  } catch {
    return { valid: false, error: 'Could not connect to license server.' };
  }
}

export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('user_licenses')
    .select('is_active')
    .eq('user_id', userId)
    .single();

  return data?.is_active ? 'pro' : 'free';
}

export async function getUsageCount(userId: string, feature: string): Promise<number> {
  const supabase = createServiceClient();
  const period = getCurrentPeriod();
  const { data } = await supabase
    .from('usage_counts')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('period', period)
    .single();

  return data?.count ?? 0;
}

export async function incrementUsage(userId: string, feature: string): Promise<number> {
  const supabase = createServiceClient();
  const period = getCurrentPeriod();
  const { data } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_feature: feature,
    p_period: period,
  });
  return data ?? 0;
}

export async function checkFeatureAccess(
  userId: string,
  feature: string
): Promise<{ allowed: boolean; reason?: string; current?: number; limit?: number }> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan];

  if (feature === 'search') {
    const used = await getUsageCount(userId, 'search');
    const limit = limits.search_per_month;
    if (used >= limit) {
      return {
        allowed: false,
        reason: `Monthly search limit reached (${used}/${limit}). Upgrade to Pro for unlimited searches.`,
        current: used,
        limit,
      };
    }
    return { allowed: true, current: used, limit };
  }

  if (feature === 'project_create') {
    const supabase = createServiceClient();
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    const max = limits.max_projects;
    if ((count ?? 0) >= max) {
      return {
        allowed: false,
        reason: `Project limit reached (${count}/${max}). Upgrade to Pro for unlimited projects.`,
        current: count ?? 0,
        limit: max,
      };
    }
    return { allowed: true, current: count ?? 0, limit: max };
  }

  const featureKey = feature as keyof typeof limits;
  if (featureKey in limits && limits[featureKey] === false) {
    return {
      allowed: false,
      reason: `${feature} is a Pro feature. Upgrade to unlock.`,
    };
  }

  return { allowed: true };
}
