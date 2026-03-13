/**
 * Client-side activity logger.
 * Fires POST requests to /api/activity in a fire-and-forget manner.
 * Never blocks the UI — errors are silently swallowed.
 */
export function logActivity(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): void {
  // Fire-and-forget: don't await, don't block UI
  fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    }),
  }).catch(() => {
    // Silently ignore — logging should never disrupt the user experience
  });
}
