import { createServiceClient } from '@/lib/supabase/server';

/**
 * Server-side activity logger.
 * Inserts activity records using the service role client (bypasses RLS).
 * Wrapped in try/catch so logging errors never break the main operation.
 */
export async function logActivityServer(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('activity_log').insert({
      user_id: userId,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: metadata || {},
    });
  } catch {
    // Don't let logging errors break the app
  }
}
