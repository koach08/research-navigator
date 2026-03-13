'use client';

import { useState } from 'react';
import type { UnifiedSearchResult } from '@/types/paper';
import type { Project } from '@/types/project';
import { formatAuthors, formatNumber } from '@/lib/utils';
import {
  BookOpen,
  ExternalLink,
  Plus,
  ChevronDown,
  Loader2,
  Sparkles,
  AlertTriangle,
  Quote,
} from 'lucide-react';

interface PaperCardProps {
  paper: UnifiedSearchResult & { db_id?: string };
  projects: Project[];
  onAddToProject: (projectId: string, paperId: string) => Promise<unknown>;
  onSummarize: (title: string, abstract: string, paperId?: string) => Promise<{
    summary_ja: string;
    summary_en: string;
    key_findings: string[];
  } | null>;
}

export function PaperCard({ paper, projects, onAddToProject, onSummarize }: PaperCardProps) {
  const [showAbstract, setShowAbstract] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [aiSummary, setAiSummary] = useState<{
    summary_ja: string;
    summary_en: string;
    key_findings: string[];
  } | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());

  const handleSummarize = async () => {
    if (!paper.abstract || summarizing) return;
    setSummarizing(true);
    const result = await onSummarize(paper.title, paper.abstract, paper.db_id);
    if (result) setAiSummary(result);
    setSummarizing(false);
  };

  const handleAddToProject = async (projectId: string) => {
    if (!paper.db_id) return;
    await onAddToProject(projectId, paper.db_id);
    setAddedTo(prev => new Set([...prev, projectId]));
    setShowProjects(false);
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 hover:border-zinc-600/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white leading-snug">
            {paper.title}
          </h3>
          {paper.title_ja && paper.title_ja !== paper.title && (
            <p className="text-xs text-zinc-500 mt-0.5">{paper.title_ja}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400">
            <span>{formatAuthors(paper.authors)}</span>
            {paper.year && (
              <>
                <span className="text-zinc-600">|</span>
                <span>{paper.year}</span>
              </>
            )}
            {paper.venue && (
              <>
                <span className="text-zinc-600">|</span>
                <span className="truncate max-w-[200px]">{paper.venue}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* TLDR from Semantic Scholar */}
      {paper.tldr && (
        <p className="mt-2 text-xs text-zinc-400 bg-zinc-800 rounded px-2 py-1.5 leading-relaxed">
          {paper.tldr}
        </p>
      )}

      {/* AI Summary */}
      {aiSummary && (
        <div className="mt-2 bg-blue-500/5 border border-blue-500/20 rounded-md p-3">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle size={10} className="text-amber-500" />
            <span className="text-[10px] text-amber-500 font-medium">AI生成</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{aiSummary.summary_ja}</p>
          {aiSummary.key_findings?.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {aiSummary.key_findings.map((f, i) => (
                <li key={i} className="text-xs text-zinc-400 flex items-start gap-1">
                  <span className="text-blue-400 mt-0.5">•</span>
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Abstract toggle */}
      {paper.abstract && (
        <div className="mt-2">
          <button
            onClick={() => setShowAbstract(!showAbstract)}
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
          >
            <ChevronDown size={12} className={showAbstract ? 'rotate-180' : ''} />
            原文Abstract
          </button>
          {showAbstract && (
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed max-h-32 overflow-y-auto">
              {paper.abstract}
            </p>
          )}
        </div>
      )}

      {/* Footer: badges + actions */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-700/50">
        <div className="flex items-center gap-2">
          {/* OA Badge */}
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              paper.is_open_access
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {paper.is_open_access ? 'Open Access' : '有料'}
          </span>

          {/* Citation count */}
          <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
            <Quote size={10} />
            {formatNumber(paper.citation_count)}
          </span>

          {/* Sources */}
          {paper.sources?.map(s => (
            <span key={s} className="text-[10px] text-zinc-600 bg-zinc-800 px-1 py-0.5 rounded">
              {s === 'semantic_scholar' ? 'S2' : s === 'openalex' ? 'OA' : 'CiNii'}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {/* AI Summarize */}
          {paper.abstract && !aiSummary && (
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="text-xs text-zinc-500 hover:text-blue-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800"
            >
              {summarizing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              AI要約
            </button>
          )}

          {/* PDF link */}
          {paper.pdf_url && (
            <a
              href={paper.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-green-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800"
            >
              <BookOpen size={12} />
              PDF
            </a>
          )}

          {/* DOI link */}
          {paper.doi && (
            <a
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800"
            >
              <ExternalLink size={12} />
              DOI
            </a>
          )}

          {/* Add to project */}
          <div className="relative">
            <button
              onClick={() => setShowProjects(!showProjects)}
              className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 bg-zinc-800/50"
            >
              <Plus size={12} />
              追加
            </button>
            {showProjects && projects.length > 0 && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-10">
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAddToProject(p.id)}
                    disabled={addedTo.has(p.id)}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate">{p.name}</span>
                    {addedTo.has(p.id) && <span className="text-green-400 ml-auto">追加済</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
