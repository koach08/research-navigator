'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Project } from '@/types/project';
import { useAuth } from './use-auth';

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        headers: { 'x-user-id': user.id },
      });
      const json = await res.json();
      if (json.data) setProjects(json.data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(async (data: {
    name: string;
    description?: string;
    field?: string;
    color?: string;
  }) => {
    if (!user) return null;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.data) {
      setProjects(prev => [{ ...json.data, paper_count: 0 }, ...prev]);
    }
    return json;
  }, [user]);

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
    if (!user) return null;
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.data) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...json.data } : p));
    }
    return json;
  }, [user]);

  const deleteProject = useCallback(async (id: string) => {
    if (!user) return;
    await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': user.id },
    });
    setProjects(prev => prev.filter(p => p.id !== id));
  }, [user]);

  return { projects, loading, createProject, updateProject, deleteProject, refetch: fetchProjects };
}
