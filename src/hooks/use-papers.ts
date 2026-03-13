'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProjectPaper } from '@/types/paper';
import { useAuth } from './use-auth';

export function useProjectPapers(projectId: string | null) {
  const { user } = useAuth();
  const [papers, setPapers] = useState<ProjectPaper[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPapers = useCallback(async () => {
    if (!user || !projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/papers`, {
        headers: { 'x-user-id': user.id },
      });
      const json = await res.json();
      if (json.data) setPapers(json.data);
    } catch (err) {
      console.error('Failed to fetch papers:', err);
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  return { papers, loading, refetch: fetchPapers };
}
