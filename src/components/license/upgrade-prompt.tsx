'use client';

import { Crown, Lock } from 'lucide-react';
import Link from 'next/link';

interface UpgradePromptProps {
  feature: string;
  description?: string;
}

export function UpgradePrompt({ feature, description }: UpgradePromptProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
        <Lock size={28} className="text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {feature} — Pro Feature
      </h3>
      <p className="text-sm text-zinc-400 max-w-md mb-6">
        {description || `${feature} is available with a Pro license. Upgrade to unlock this feature and get unlimited access to all tools.`}
      </p>
      <div className="flex gap-3">
        <Link
          href="/settings"
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2"
        >
          <Crown size={14} />
          Upgrade to Pro
        </Link>
        <a
          href="https://nipponbusiness.gumroad.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-zinc-800 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
        >
          Purchase License
        </a>
      </div>
    </div>
  );
}

export function UpgradeBanner({ message }: { message: string }) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-3">
      <Crown size={16} className="text-amber-400 shrink-0" />
      <p className="text-xs text-amber-300 flex-1">{message}</p>
      <Link
        href="/settings"
        className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-lg hover:bg-amber-500/30 transition-colors shrink-0"
      >
        Upgrade
      </Link>
    </div>
  );
}
