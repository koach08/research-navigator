'use client';

import { useState, useCallback } from 'react';
import type { UnifiedSearchResult } from '@/types/paper';
import { useAuth } from './use-auth';

interface SearchOptions {
  sources?: string[];
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
}

export function useSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<(UnifiedSearchResult & { db_id?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const search = useCallback(async (query: string, options: SearchOptions = {}) => {
    if (!user || !query.trim()) return;
    setLoading(true);
    setErrors([]);

    try {
      const params = new URLSearchParams({ q: query });
      if (options.sources?.length) params.set('sources', options.sources.join(','));
      if (options.yearFrom) params.set('yearFrom', options.yearFrom.toString());
      if (options.yearTo) params.set('yearTo', options.yearTo.toString());
      if (options.limit) params.set('limit', options.limit.toString());

      const res = await fetch(`/api/search/unified?${params}`, {
        headers: { 'x-user-id': user.id },
      });

      const json = await res.json();

      if (json.error) {
        setErrors([json.error]);
        return;
      }

      setResults(json.data || []);
      setTotal(json.total || 0);
      if (json.errors) setErrors(json.errors);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Search failed']);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addToProject = useCallback(async (projectId: string, paperId: string) => {
    if (!user) return;
    const res = await fetch(`/api/projects/${projectId}/papers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ paper_id: paperId }),
    });
    return res.json();
  }, [user]);

  const summarize = useCallback(async (title: string, abstract: string, paperId?: string) => {
    if (!user) return null;
    const res = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ title, abstract, paper_id: paperId }),
    });
    const json = await res.json();
    return json.data || null;
  }, [user]);

  return { results, loading, total, errors, search, addToProject, summarize };
}
