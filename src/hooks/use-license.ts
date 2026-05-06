'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface UsageInfo {
  used: number;
  limit: number;
}

interface LicenseState {
  plan: 'free' | 'pro';
  isPro: boolean;
  activatedAt: string | null;
  hasKey: boolean;
  usage: {
    search: UsageInfo;
    projects: UsageInfo;
  };
  loading: boolean;
}

export function useLicense() {
  const { user } = useAuth();
  const [state, setState] = useState<LicenseState>({
    plan: 'free',
    isPro: false,
    activatedAt: null,
    hasKey: false,
    usage: {
      search: { used: 0, limit: 10 },
      projects: { used: 0, limit: 2 },
    },
    loading: true,
  });

  const fetchLicense = useCallback(async () => {
    if (!user?.id) return;

    try {
      const res = await fetch('/api/license/verify', {
        headers: { 'x-user-id': user.id },
      });
      if (res.ok) {
        const data = await res.json();
        setState({
          ...data,
          loading: false,
        });
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  return {
    ...state,
    refresh: fetchLicense,
  };
}
