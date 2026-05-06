'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLicense } from '@/hooks/use-license';
import { useProjects } from '@/hooks/use-projects';
import { formatAuthors, formatNumber } from '@/lib/utils';
import {
  Sparkles,
  Loader2,
  BookOpen,
  ExternalLink,
  Plus,
  AlertTriangle,
  Star,
  BookMarked,
  Library,
  Lightbulb,
  ChevronDown,
  Upload,
  FileText,
  X,
  Compass,
  Rocket,
} from 'lucide-react';

interface ScoredPaper {
  title: string;
  authors?: { name: string }[];
  year?: number;
  venue?: string;
  doi?: string;
  abstract?: string;
  citation_count: number;
  is_open_access: boolean;
  pdf_url?: string;
  relevance: number;
  recommendation_category: string;
  reason_ja: string;
  db_id?: string;
  search_category?: string;
}

interface NextResearchDirection {
  title: string;
  description: string;
  rationale: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface DevelopmentPossibility {
  direction: string;
  description: string;
  potential_impact: 'high' | 'medium' | 'low';
}

interface AdvisorResult {
  analysis: {
    research_summary: string;
    key_concepts: string[];
    expected_fields: string[];
    advice: string;
  };
  categories: {
    id: string;
    label: string;
    description: string;
    papers: ScoredPaper[];
  }[];
  search_queries: {
    query: string;
    category: string;
    purpose: string;
  }[];
  next_research_directions: NextResearchDirection[];
  development_possibilities: DevelopmentPossibility[];
}

const CONTEXT_TYPES = [
  { value: '研究テーマ', label: '研究テーマ・アイデア' },
  { value: '研究計画書', label: '研究計画書' },
  { value: '科研費申請書', label: '科研費申請書' },
  { value: 'ブレインストーミング', label: 'ブレインストーミングメモ' },
  { value: '論文草稿', label: '論文草稿・概要' },
];

const CATEGORY_CONFIG = {
  must_read: { icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  recommended: { icon: BookMarked, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  related: { icon: Library, color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
};

const DIFFICULTY_CONFIG = {
  easy: { label: '取り組みやすい', color: 'text-green-400', bg: 'bg-green-500/10' },
  medium: { label: '標準的', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  hard: { label: '挑戦的', color: 'text-red-400', bg: 'bg-red-500/10' },
};

const IMPACT_CONFIG = {
  high: { label: '高インパクト', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  medium: { label: '中インパクト', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  low: { label: '低インパクト', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
};

export default function AdvisorPage() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const [text, setText] = useState('');
  const [contextType, setContextType] = useState('研究テーマ');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [error, setError] = useState('');

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedText, setUploadedText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'docx', 'txt'].includes(ext)) {
      setUploadError('PDF, DOCX, TXT ファイルのみ対応しています');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('ファイルサイズは10MB以下にしてください');
      return;
    }

    setUploadedFile(file);
    setUploadError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/parse', {
        method: 'POST',
        headers: { 'x-user-id': user?.id || '' },
        body: formData,
      });

      const json = await res.json();
      if (json.error) {
        setUploadError(json.error);
        setUploadedFile(null);
      } else {
        setUploadedText(json.text);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'ファイルの解析に失敗しました');
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = () => {
    setUploadedFile(null);
    setUploadedText('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    const combinedText = [text.trim(), uploadedText].filter(Boolean).join('\n\n---\n\n');
    if (!combinedText || !user) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/ai/research-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ text: combinedText, context_type: contextType }),
      });

      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setResult(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const addToProject = async (projectId: string, paperId: string) => {
    if (!user) return;
    await fetch(`/api/projects/${projectId}/papers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ paper_id: paperId }),
    });
  };

  const hasInput = text.trim().length > 0 || uploadedText.length > 0;
  const { isPro, loading: licenseLoading } = useLicense();

  if (!licenseLoading && !isPro) {
    const { UpgradePrompt } = require('@/components/license/upgrade-prompt');
    return (
      <UpgradePrompt
        feature="AI Research Advisor"
        description="AIが研究テーマを分析し、関連文献の検索・推薦・研究方向の提案を行います。Pro版でご利用いただけます。"
      />
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">研究アドバイザー</h2>
        <p className="text-sm text-zinc-500 mt-1">
          研究テーマや計画書を入力（またはファイルをアップロード）すると、AIが関連文献を分析・推薦します
        </p>
      </div>

      {/* Input area */}
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs text-zinc-400">入力タイプ:</label>
          <select
            value={contextType}
            onChange={e => setContextType(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-xs px-2 py-1 focus:outline-none focus:border-blue-500"
          >
            {CONTEXT_TYPES.map(ct => (
              <option key={ct.value} value={ct.value}>{ct.label}</option>
            ))}
          </select>
        </div>

        {/* File upload zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-4 mb-3 transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-500/5'
              : uploadedFile
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-zinc-700 hover:border-zinc-600'
          }`}
        >
          {uploadedFile ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-green-400" />
                <span className="text-sm text-zinc-300">{uploadedFile.name}</span>
                <span className="text-xs text-zinc-500">
                  ({(uploadedFile.size / 1024).toFixed(0)} KB)
                </span>
                {uploading && <Loader2 size={14} className="animate-spin text-blue-400" />}
                {!uploading && uploadedText && (
                  <span className="text-xs text-green-400">
                    {uploadedText.length.toLocaleString()} 文字抽出済み
                  </span>
                )}
              </div>
              <button
                onClick={removeFile}
                className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="text-center">
              <Upload size={20} className="mx-auto text-zinc-500 mb-1" />
              <p className="text-xs text-zinc-400">
                ファイルをドラッグ＆ドロップ、または{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  クリックして選択
                </button>
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">PDF, DOCX, TXT（最大10MB）</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
        </div>

        {uploadError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-2 mb-3">
            <p className="text-xs text-red-400">{uploadError}</p>
          </div>
        )}

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={
            uploadedFile
              ? 'アップロードしたファイルに加えて、追加のメモや指示があればここに入力してください（任意）...'
              : contextType === '研究テーマ'
              ? '例: AIが生成するフェイクニュースがジャーナリズムの信頼性に与える影響について研究したい。特にソーシャルメディア上での拡散メカニズムと、メディアリテラシー教育の効果に焦点を当てたい。'
              : contextType === '科研費申請書'
              ? '研究目的、研究計画、研究の背景などを貼り付けてください...'
              : '研究に関するメモや考えを自由に入力してください...'
          }
          className="w-full h-48 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-y"
        />

        <div className="flex items-center justify-between mt-3">
          <p className="text-[10px] text-zinc-600">
            <AlertTriangle size={10} className="inline mr-1" />
            AI分析結果は参考情報です。推薦文献の適切性は必ずご自身で確認してください。
          </p>
          <button
            onClick={handleSubmit}
            disabled={loading || !hasInput || uploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                文献を分析・推薦
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-8 text-center">
          <Loader2 size={28} className="animate-spin text-blue-400 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">研究テーマを分析し、関連文献を検索しています...</p>
          <p className="text-xs text-zinc-600 mt-1">30秒〜1分ほどかかります</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Analysis summary */}
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={16} className="text-amber-400" />
              <h3 className="text-sm font-medium text-white">AI分析結果</h3>
              <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">AI生成</span>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed mb-3">
              {result.analysis.research_summary}
            </p>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {result.analysis.key_concepts?.map((concept, i) => (
                <span key={i} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                  {concept}
                </span>
              ))}
              {result.analysis.expected_fields?.map((field, i) => (
                <span key={i} className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded">
                  {field}
                </span>
              ))}
            </div>

            <div className="bg-zinc-900/50 rounded-md p-3">
              <p className="text-xs text-zinc-400 leading-relaxed">{result.analysis.advice}</p>
            </div>
          </div>

          {/* Next Research Directions */}
          {result.next_research_directions && result.next_research_directions.length > 0 && (
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Compass size={16} className="text-purple-400" />
                <h3 className="text-sm font-medium text-white">次の研究テーマ候補</h3>
                <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">AI生成</span>
              </div>
              <div className="space-y-3">
                {result.next_research_directions.map((dir, i) => {
                  const diffConfig = DIFFICULTY_CONFIG[dir.difficulty] || DIFFICULTY_CONFIG.medium;
                  return (
                    <div key={i} className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-white flex-1">{dir.title}</h4>
                        <span className={`text-[10px] ${diffConfig.color} ${diffConfig.bg} px-1.5 py-0.5 rounded`}>
                          {diffConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-1">{dir.description}</p>
                      <p className="text-xs text-purple-400/80 leading-relaxed">
                        <span className="font-medium">根拠: </span>{dir.rationale}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Development Possibilities */}
          {result.development_possibilities && result.development_possibilities.length > 0 && (
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Rocket size={16} className="text-cyan-400" />
                <h3 className="text-sm font-medium text-white">発展可能性</h3>
                <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">AI生成</span>
              </div>
              <div className="space-y-3">
                {result.development_possibilities.map((pos, i) => {
                  const impactConfig = IMPACT_CONFIG[pos.potential_impact] || IMPACT_CONFIG.medium;
                  return (
                    <div key={i} className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-white flex-1">{pos.direction}</h4>
                        <span className={`text-[10px] ${impactConfig.color} ${impactConfig.bg} px-1.5 py-0.5 rounded`}>
                          {impactConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{pos.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paper categories */}
          {result.categories.map(cat => {
            const config = CATEGORY_CONFIG[cat.id as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.related;
            const Icon = config.icon;

            if (cat.papers.length === 0) return null;

            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className={config.color} />
                  <h3 className="text-sm font-medium text-white">{cat.label}</h3>
                  <span className="text-xs text-zinc-500">({cat.papers.length}件)</span>
                  <span className="text-xs text-zinc-600">-- {cat.description}</span>
                </div>

                <div className="space-y-2">
                  {cat.papers.map((paper, i) => (
                    <AdvisorPaperCard
                      key={`${cat.id}-${i}`}
                      paper={paper}
                      config={config}
                      projects={projects}
                      onAddToProject={addToProject}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Search queries used */}
          <details className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg">
            <summary className="p-3 text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">
              使用した検索クエリを表示
            </summary>
            <div className="px-3 pb-3 space-y-1">
              {result.search_queries?.map((sq, i) => (
                <div key={i} className="text-xs text-zinc-500 flex items-start gap-2">
                  <span className="text-zinc-600 flex-shrink-0 w-20">
                    {sq.category === 'foundational' ? '基礎' :
                     sq.category === 'methodology' ? '方法論' :
                     sq.category === 'recent' ? '最新' : '関連'}
                  </span>
                  <span className="text-zinc-400 font-mono">{sq.query}</span>
                  <span className="text-zinc-600">-- {sq.purpose}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function AdvisorPaperCard({
  paper,
  config,
  projects,
  onAddToProject,
}: {
  paper: ScoredPaper;
  config: { color: string; bg: string; border: string };
  projects: { id: string; name: string; color: string }[];
  onAddToProject: (projectId: string, paperId: string) => Promise<void>;
}) {
  const [showAbstract, setShowAbstract] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());

  const handleAdd = async (projectId: string) => {
    if (!paper.db_id) return;
    await onAddToProject(projectId, paper.db_id);
    setAddedTo(prev => new Set([...prev, projectId]));
    setShowProjects(false);
  };

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-white leading-snug flex-1">{paper.title}</h4>
            {/* Relevance badge */}
            <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
              paper.relevance >= 80 ? 'bg-amber-500/20 text-amber-400' :
              paper.relevance >= 50 ? 'bg-blue-500/20 text-blue-400' :
              'bg-zinc-500/20 text-zinc-400'
            }`}>
              {paper.relevance}%
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
            <span>{formatAuthors(paper.authors || [])}</span>
            {paper.year && <span>({paper.year})</span>}
            {paper.venue && <span className="truncate max-w-[200px]">&#x2022; {paper.venue}</span>}
          </div>

          {/* AI reason */}
          <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
            <span className="text-amber-500">[AI] </span>
            {paper.reason_ja}
          </p>
        </div>
      </div>

      {/* Abstract toggle */}
      {paper.abstract && (
        <div className="mt-2">
          <button
            onClick={() => setShowAbstract(!showAbstract)}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
          >
            <ChevronDown size={10} className={showAbstract ? 'rotate-180' : ''} />
            Abstract
          </button>
          {showAbstract && (
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed max-h-24 overflow-y-auto">
              {paper.abstract}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2 text-[10px]">
          <span className={paper.is_open_access
            ? 'text-green-400 bg-green-500/10 px-1 py-0.5 rounded'
            : 'text-red-400 bg-red-500/10 px-1 py-0.5 rounded'
          }>
            {paper.is_open_access ? 'OA' : '有料'}
          </span>
          <span className="text-zinc-500">被引用: {formatNumber(paper.citation_count)}</span>
        </div>

        <div className="flex items-center gap-1">
          {paper.pdf_url && (
            <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer"
               className="text-[11px] text-zinc-500 hover:text-green-400 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5">
              <BookOpen size={10} /> PDF
            </a>
          )}
          {paper.doi && (
            <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer"
               className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5">
              <ExternalLink size={10} /> DOI
            </a>
          )}
          <div className="relative">
            <button
              onClick={() => setShowProjects(!showProjects)}
              className="text-[11px] text-zinc-500 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5 bg-white/[0.03]"
            >
              <Plus size={10} /> 追加
            </button>
            {showProjects && projects.length > 0 && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-10">
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAdd(p.id)}
                    disabled={addedTo.has(p.id)}
                    className="w-full text-left px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="truncate">{p.name}</span>
                    {addedTo.has(p.id) && <span className="text-green-400 ml-auto">済</span>}
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
