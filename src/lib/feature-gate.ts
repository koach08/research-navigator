import { NextResponse } from 'next/server';
import { checkFeatureAccess, incrementUsage } from '@/lib/license';

export async function checkAccess(
  userId: string,
  feature: string
): Promise<{ allowed: boolean; error?: NextResponse }> {
  const result = await checkFeatureAccess(userId, feature);
  if (!result.allowed) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error: 'upgrade_required',
          message: result.reason,
          feature,
          limit: result.limit,
          current: result.current,
        },
        { status: 403 }
      ),
    };
  }
  return { allowed: true };
}

export async function trackUsage(userId: string, feature: string): Promise<void> {
  await incrementUsage(userId, feature);
}
