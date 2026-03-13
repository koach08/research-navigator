'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Key, Mail, ExternalLink, CheckCircle, XCircle } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-white mb-6">設定</h2>

      {/* Account info */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">アカウント</h3>
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Mail size={14} className="text-zinc-500" />
            {user?.email}
          </div>
        </div>
      </section>

      {/* API Keys info */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">AI APIキー</h3>
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-zinc-300 flex items-center gap-2">
                <Key size={14} className="text-zinc-500" />
                Claude API Key
              </label>
              <ApiKeyStatus configured={!!process.env.NEXT_PUBLIC_SUPABASE_URL} />
            </div>
            <p className="text-xs text-zinc-500 ml-6">
              .env.local の ANTHROPIC_API_KEY で設定してください。
              AI要約、引用分類、ギャップ分析に使用されます。
            </p>
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 ml-6 flex items-center gap-1 mt-1"
            >
              <ExternalLink size={10} />
              APIキー取得: console.anthropic.com
            </a>
          </div>
        </div>
      </section>

      {/* Literature API Keys */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">文献検索API（オプション）</h3>
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 space-y-4">
          <ApiKeyRow
            label="Semantic Scholar API Key"
            description="レート制限緩和用（なくても動作します）"
            envKey="SEMANTIC_SCHOLAR_API_KEY"
          />
          <ApiKeyRow
            label="CiNii Research API Key"
            description="日本語文献検索に必要"
            envKey="CINII_API_KEY"
          />
          <ApiKeyRow
            label="OpenAlex / Unpaywall メールアドレス"
            description="polite pool（高速アクセス）に必要"
            envKey="OPENALEX_EMAIL"
          />
        </div>
      </section>

      {/* Setup guide */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">セットアップ</h3>
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            すべてのAPIキーは <code className="text-blue-400">.env.local</code> ファイルで管理されます。
            <code className="text-blue-400">.env.example</code> を参考に設定してください。
          </p>
          <pre className="mt-3 bg-zinc-900 rounded p-3 text-xs text-zinc-400 overflow-x-auto">
{`# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx
OPENALEX_EMAIL=your@email.com
UNPAYWALL_EMAIL=your@email.com`}
          </pre>
        </div>
      </section>
    </div>
  );
}

function ApiKeyStatus({ configured }: { configured: boolean }) {
  return configured ? (
    <span className="flex items-center gap-1 text-xs text-green-400">
      <CheckCircle size={12} />
      設定済み
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-zinc-500">
      <XCircle size={12} />
      未設定
    </span>
  );
}

function ApiKeyRow({
  label,
  description,
  envKey,
}: {
  label: string;
  description: string;
  envKey: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm text-zinc-300">{label}</label>
        <span className="text-[10px] text-zinc-600 font-mono">{envKey}</span>
      </div>
      <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
    </div>
  );
}
