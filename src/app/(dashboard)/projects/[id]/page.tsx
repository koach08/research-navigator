'use client';

import { use, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useProjectPapers } from '@/hooks/use-papers';
import { formatAuthors, formatNumber } from '@/lib/utils';
import type { Project } from '@/types/project';
import type { ProjectPaper, PaperStatus, ReadStatus, CiteDecision } from '@/types/paper';
import {
  FileText,
  Loader2,
  BookOpen,
  ExternalLink,
  Check,
  X,
  HelpCircle,
  ChevronDown,
  Edit3,
} from 'lucide-react';
import Link from 'next/link';

type FilterStatus = 'all' | PaperStatus;

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const { papers, loading: papersLoading, refetch } = useProjectPapers(id);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    const fetchProject = async () => {
      if (!user) return;
      const res = await fetch(`/api/projects/${id}`, {
        headers: { 'x-user-id': user.id },
      });
      const json = await res.json();
      if (json.data) setProject(json.data);
      setLoading(false);
    };
    fetchProject();
  }, [user, id]);

  const filteredPapers = papers.filter(pp => {
    if (filter === 'all') return true;
    return pp.status === filter;
  });

  const statusCounts = {
    all: papers.length,
    unreviewed: papers.filter(p => p.status === 'unreviewed').length,
    included: papers.filter(p => p.status === 'included').length,
    excluded: papers.filter(p => p.status === 'excluded').length,
    maybe: papers.filter(p => p.status === 'maybe').length,
  };

  const updatePaperStatus = async (ppId: string, updates: Partial<ProjectPaper>) => {
    if (!user) return;
    await fetch(`/api/projects/${id}/papers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ id: ppId, ...updates }),
    });
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  if (!project) {
    return <p className="text-zinc-500">プロジェクトが見つかりません</p>;
  }

  return (
    <div className="max-w-4xl">
      {/* Project header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
        <div>
          <h2 className="text-xl font-bold text-white">{project.name}</h2>
          {project.field && <p className="text-xs text-zinc-500">{project.field}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-zinc-800 pb-2">
        <Link href={`/projects/${id}`} className="text-sm text-white border-b-2 border-blue-500 pb-2">
          文献一覧
        </Link>
        <Link href={`/projects/${id}/papers`} className="text-sm text-zinc-500 hover:text-white pb-2">
          スクリーニング
        </Link>
        <Link href={`/projects/${id}/network`} className="text-sm text-zinc-500 hover:text-white pb-2">
          引用ネットワーク
        </Link>
        <span className="text-sm text-zinc-600 pb-2 cursor-not-allowed">位置づけ (Phase 5)</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(Object.entries(statusCounts) as [FilterStatus, number][]).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`text-xs px-3 py-1.5 rounded-md ${
              filter === status
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {status === 'all' ? '全て' :
             status === 'unreviewed' ? '未レビュー' :
             status === 'included' ? '含める' :
             status === 'excluded' ? '除外' : '迷い'}
            <span className="ml-1 text-zinc-500">({count})</span>
          </button>
        ))}
      </div>

      {/* Papers list */}
      {papersLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="animate-spin text-zinc-500" size={20} />
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-8 text-center">
          <FileText size={32} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">
            {filter === 'all'
              ? '文献がまだ追加されていません'
              : `「${filter}」ステータスの文献はありません`}
          </p>
          {filter === 'all' && (
            <Link href="/search" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block">
              検索ページから追加 →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPapers.map(pp => (
            <ProjectPaperCard
              key={pp.id}
              projectPaper={pp}
              onUpdateStatus={updatePaperStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectPaperCard({
  projectPaper,
  onUpdateStatus,
}: {
  projectPaper: ProjectPaper;
  onUpdateStatus: (id: string, updates: Partial<ProjectPaper>) => void;
}) {
  const paper = projectPaper.paper;
  if (!paper) return null;

  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(projectPaper.notes || '');

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white">{paper.title}</h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
            <span>{formatAuthors(paper.authors || [])}</span>
            {paper.year && <span>({paper.year})</span>}
            {paper.venue && <span className="truncate max-w-[200px]">• {paper.venue}</span>}
          </div>

          {paper.ai_summary_ja && (
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              <span className="text-amber-500 text-[10px]">[AI] </span>
              {paper.ai_summary_ja}
            </p>
          )}
        </div>

        {/* Status buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onUpdateStatus(projectPaper.id, { status: 'included' })}
            className={`p-1.5 rounded ${
              projectPaper.status === 'included'
                ? 'bg-green-500/20 text-green-400'
                : 'text-zinc-600 hover:text-green-400 hover:bg-zinc-800'
            }`}
            title="含める"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => onUpdateStatus(projectPaper.id, { status: 'excluded' })}
            className={`p-1.5 rounded ${
              projectPaper.status === 'excluded'
                ? 'bg-red-500/20 text-red-400'
                : 'text-zinc-600 hover:text-red-400 hover:bg-zinc-800'
            }`}
            title="除外"
          >
            <X size={14} />
          </button>
          <button
            onClick={() => onUpdateStatus(projectPaper.id, { status: 'maybe' })}
            className={`p-1.5 rounded ${
              projectPaper.status === 'maybe'
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-zinc-600 hover:text-amber-400 hover:bg-zinc-800'
            }`}
            title="迷い"
          >
            <HelpCircle size={14} />
          </button>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-700/30">
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-1.5 py-0.5 rounded ${
            paper.is_open_access
              ? 'bg-green-500/10 text-green-400'
              : 'bg-red-500/10 text-red-400'
          }`}>
            {paper.is_open_access ? 'OA' : '有料'}
          </span>
          <span className="text-zinc-500">被引用: {formatNumber(paper.citation_count)}</span>

          {/* Read status */}
          <select
            value={projectPaper.read_status}
            onChange={e => onUpdateStatus(projectPaper.id, { read_status: e.target.value as ReadStatus })}
            className="bg-zinc-800 border border-zinc-700 text-zinc-400 rounded text-xs px-1 py-0.5 focus:outline-none"
          >
            <option value="unread">未読</option>
            <option value="reading">読書中</option>
            <option value="read">読了</option>
          </select>

          {/* Cite decision */}
          <select
            value={projectPaper.cite_decision}
            onChange={e => onUpdateStatus(projectPaper.id, { cite_decision: e.target.value as CiteDecision })}
            className="bg-zinc-800 border border-zinc-700 text-zinc-400 rounded text-xs px-1 py-0.5 focus:outline-none"
          >
            <option value="undecided">引用未定</option>
            <option value="will_cite">引用する</option>
            <option value="wont_cite">引用しない</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800"
          >
            <Edit3 size={12} />
            メモ
          </button>
          {paper.pdf_url && (
            <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer"
               className="text-xs text-zinc-500 hover:text-green-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800">
              <BookOpen size={12} /> PDF
            </a>
          )}
          {paper.doi && (
            <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer"
               className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800">
              <ExternalLink size={12} /> DOI
            </a>
          )}
        </div>
      </div>

      {/* Notes */}
      {showNotes && (
        <div className="mt-2">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => onUpdateStatus(projectPaper.id, { notes })}
            placeholder="メモを入力..."
            className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none h-16"
          />
        </div>
      )}
    </div>
  );
}
