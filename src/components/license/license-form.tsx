'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLicense } from '@/hooks/use-license';
import { Key, CheckCircle, Loader2, Crown, Zap } from 'lucide-react';

export function LicenseForm() {
  const { user } = useAuth();
  const { plan, isPro, activatedAt, usage, loading, refresh } = useLicense();
  const [licenseKey, setLicenseKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !licenseKey.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/license/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ licenseKey: licenseKey.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Pro license activated!');
        setLicenseKey('');
        refresh();
      } else {
        setError(data.error || 'Failed to verify license key');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!user?.id) return;
    setSubmitting(true);

    try {
      await fetch('/api/license/verify', {
        method: 'DELETE',
        headers: { 'x-user-id': user.id },
      });
      refresh();
    } catch {
      setError('Failed to deactivate');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 flex items-center gap-2 text-zinc-500 text-sm">
        <Loader2 size={14} className="animate-spin" />
        Loading...
      </div>
    );
  }

  if (isPro) {
    return (
      <div className="bg-zinc-800/50 border border-amber-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">Pro Plan</span>
          </div>
          <span className="text-[10px] text-zinc-500">
            Activated: {activatedAt ? new Date(activatedAt).toLocaleDateString() : '-'}
          </span>
        </div>
        <p className="text-xs text-zinc-400 mb-3">
          All features unlocked. Unlimited searches, AI advisor, paper review, and more.
        </p>
        <button
          onClick={handleDeactivate}
          disabled={submitting}
          className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          {submitting ? 'Processing...' : 'Deactivate License'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={16} className="text-blue-400" />
        <span className="text-sm font-semibold text-white">Free Plan</span>
      </div>

      {/* Usage summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <UsageBar label="Searches" used={usage.search.used} limit={usage.search.limit} />
        <UsageBar label="Projects" used={usage.projects.used} limit={usage.projects.limit} />
      </div>

      <div className="text-xs text-zinc-500 mb-3">
        Upgrade to Pro for unlimited searches, AI advisor, paper review, and more.
      </div>

      <form onSubmit={handleActivate} className="flex gap-2">
        <div className="flex-1 relative">
          <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="Enter license key..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !licenseKey.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Activate'}
        </button>
      </form>

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      {success && (
        <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
          <CheckCircle size={12} />
          {success}
        </p>
      )}

      <a
        href="https://nipponbusiness.gumroad.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        Purchase a license →
      </a>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = !isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
  const isNearLimit = pct >= 80;

  return (
    <div className="bg-zinc-900/50 rounded-lg p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-zinc-500">{label}</span>
        <span className={`text-[10px] font-mono ${isNearLimit ? 'text-amber-400' : 'text-zinc-400'}`}>
          {used}/{isUnlimited ? '∞' : limit}
        </span>
      </div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isNearLimit ? 'bg-amber-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
