'use client';

import Link from 'next/link';
import { useProjects } from '@/hooks/use-projects';
import { FolderOpen, Search, FileText, Loader2 } from 'lucide-react';

export default function DashboardHome() {
  const { projects, loading } = useProjects();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h2 className="text-xl font-bold text-white mb-6">ダッシュボード</h2>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Link
          href="/search"
          className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 hover:border-blue-500/30 hover:bg-blue-500/5 transition-colors group"
        >
          <Search size={20} className="text-blue-400 mb-2" />
          <h3 className="text-sm font-medium text-white">文献検索</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Semantic Scholar, OpenAlex, CiNii から統合検索
          </p>
        </Link>

        <Link
          href="/trends"
          className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 hover:border-green-500/30 hover:bg-green-500/5 transition-colors group"
        >
          <FileText size={20} className="text-green-400 mb-2" />
          <h3 className="text-sm font-medium text-white">トレンド</h3>
          <p className="text-xs text-zinc-500 mt-1">分野のトレンドを確認</p>
        </Link>

        <Link
          href="/settings"
          className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 hover:border-amber-500/30 hover:bg-amber-500/5 transition-colors group"
        >
          <FolderOpen size={20} className="text-amber-400 mb-2" />
          <h3 className="text-sm font-medium text-white">設定</h3>
          <p className="text-xs text-zinc-500 mt-1">APIキー・アカウント設定</p>
        </Link>
      </div>

      {/* Projects overview */}
      <h3 className="text-sm font-semibold text-zinc-400 mb-3">プロジェクト一覧</h3>

      {projects.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-8 text-center">
          <FolderOpen size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">プロジェクトがありません</p>
          <p className="text-xs text-zinc-500 mt-1">
            左サイドバーの「New Project」からプロジェクトを作成してください
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {projects.map(project => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <h4 className="text-sm font-medium text-white">{project.name}</h4>
              </div>
              {project.field && (
                <p className="text-xs text-zinc-500 mb-2">{project.field}</p>
              )}
              {project.description && (
                <p className="text-xs text-zinc-400 line-clamp-2">{project.description}</p>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <FileText size={12} />
                <span>{project.paper_count || 0} 文献</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
