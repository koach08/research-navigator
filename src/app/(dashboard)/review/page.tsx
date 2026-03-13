'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { formatAuthors, formatNumber } from '@/lib/utils';
import {
  ClipboardCheck,
  Loader2,
  Upload,
  FileText,
  X,
  AlertTriangle,
  Target,
  Gauge,
  GitCompareArrows,
  ThumbsUp,
  Wrench,
  BookMarked,
  ChevronDown,
  ExternalLink,
  BookOpen,
  MessageSquare,
  Microscope,
} from 'lucide-react';

interface PaperRef {
  paper_index: number;
  paper_title: string;
  title?: string;
  authors?: { name: string }[];
  year?: number;
  doi?: string;
  venue?: string;
  is_open_access?: boolean;
  pdf_url?: string;
  citation_count?: number;
}

interface Comparison extends PaperRef {
  similarity: string;
  difference: string;
  relation: 'complementary' | 'overlapping' | 'extending' | 'contrasting';
}

interface Strength {
  point: string;
  explanation: string;
}

interface Improvement {
  point: string;
  explanation: string;
  priority: 'high' | 'medium' | 'low';
}

interface CitationSuggestion extends PaperRef {
  reason: string;
}

interface ReviewResult {
  extraction: {
    title_guess: string;
    research_questions: string[];
    key_claims: string[];
    methodology: string;
    field: string;
  };
  review: {
    research_positioning: string;
    originality_score: number;
    originality_explanation: string;
    comparison_with_prior_work: Comparison[];
    strengths: Strength[];
    improvements: Improvement[];
    papers_to_cite: CitationSuggestion[];
    overall_assessment: string;
  };
  search_queries: { query: string; purpose: string }[];
  related_papers_count: number;
}

const RELATION_CONFIG = {
  complementary: { label: '補完的', color: 'text-green-400', bg: 'bg-green-500/10' },
  overlapping: { label: '重複', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  extending: { label: '拡張', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  contrasting: { label: '対照的', color: 'text-purple-400', bg: 'bg-purple-500/10' },
};

const PRIORITY_CONFIG = {
  high: { label: '優先度: 高', color: 'text-red-400', bg: 'bg-red-500/10' },
  medium: { label: '優先度: 中', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  low: { label: '優先度: 低', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
};

export default function ReviewPage() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState('');

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedText, setUploadedText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['positioning', 'originality', 'comparison', 'strengths', 'improvements', 'citations', 'assessment'])
  );

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
    const combinedText = [uploadedText, text.trim()].filter(Boolean).join('\n\n---\n\n');
    if (!combinedText || !user) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ text: combinedText }),
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

  const hasInput = text.trim().length > 0 || uploadedText.length > 0;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">査読・レビュー</h2>
        <p className="text-sm text-zinc-500 mt-1">
          研究提案書や論文をアップロード（またはテキストを貼り付け）すると、AIが独自性・先行研究との比較を分析します
        </p>
      </div>

      {/* Input area */}
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 mb-6">
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
                研究提案書・論文ファイルをドラッグ＆ドロップ、または{' '}
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
              ? '追加のコンテキストやメモがあればここに入力してください（任意）...'
              : '研究提案書や論文のテキストを貼り付けてください...'
          }
          className="w-full h-48 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-y"
        />

        <div className="flex items-center justify-between mt-3">
          <p className="text-[10px] text-zinc-600">
            <AlertTriangle size={10} className="inline mr-1" />
            AI査読結果は参考情報です。正式な査読の代わりにはなりません。
          </p>
          <button
            onClick={handleSubmit}
            disabled={loading || !hasInput || uploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                査読中...
              </>
            ) : (
              <>
                <ClipboardCheck size={14} />
                査読を実行
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-8 text-center">
          <Loader2 size={28} className="animate-spin text-blue-400 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">研究内容を分析し、関連文献と比較しています...</p>
          <p className="text-xs text-zinc-600 mt-1">1〜2分ほどかかります</p>
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
        <div className="space-y-4">
          {/* Extraction summary */}
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Microscope size={16} className="text-blue-400" />
              <h3 className="text-sm font-medium text-white">抽出された研究情報</h3>
              <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">AI生成</span>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-zinc-500">推定タイトル:</span>
                <p className="text-sm text-zinc-300">{result.extraction.title_guess}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">分野:</span>
                <span className="text-sm text-zinc-300 ml-2">{result.extraction.field}</span>
              </div>
              <div>
                <span className="text-xs text-zinc-500">研究課題:</span>
                <ul className="mt-1 space-y-0.5">
                  {result.extraction.research_questions?.map((q, i) => (
                    <li key={i} className="text-xs text-zinc-400 pl-3">&#x2022; {q}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-xs text-zinc-500">方法論:</span>
                <p className="text-xs text-zinc-400 mt-0.5">{result.extraction.methodology}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {result.extraction.key_claims?.map((claim, i) => (
                  <span key={i} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                    {claim}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Originality Score */}
          <CollapsibleSection
            id="originality"
            icon={Gauge}
            iconColor="text-amber-400"
            title="独自性の評価"
            expanded={expandedSections.has('originality')}
            onToggle={() => toggleSection('originality')}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#27272a" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke={
                      result.review.originality_score >= 70 ? '#22c55e' :
                      result.review.originality_score >= 50 ? '#eab308' :
                      result.review.originality_score >= 30 ? '#f97316' : '#ef4444'
                    }
                    strokeWidth="6"
                    strokeDasharray={`${(result.review.originality_score / 100) * 213.6} 213.6`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-lg font-bold ${
                    result.review.originality_score >= 70 ? 'text-green-400' :
                    result.review.originality_score >= 50 ? 'text-yellow-400' :
                    result.review.originality_score >= 30 ? 'text-orange-400' : 'text-red-400'
                  }`}>
                    {result.review.originality_score}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {result.review.originality_explanation}
                </p>
              </div>
            </div>
          </CollapsibleSection>

          {/* Research Positioning */}
          <CollapsibleSection
            id="positioning"
            icon={Target}
            iconColor="text-green-400"
            title="研究の位置づけ"
            expanded={expandedSections.has('positioning')}
            onToggle={() => toggleSection('positioning')}
          >
            <p className="text-sm text-zinc-300 leading-relaxed">
              {result.review.research_positioning}
            </p>
          </CollapsibleSection>

          {/* Comparison with Prior Work */}
          <CollapsibleSection
            id="comparison"
            icon={GitCompareArrows}
            iconColor="text-purple-400"
            title="先行研究との比較"
            subtitle={`${result.review.comparison_with_prior_work?.length || 0} 件の関連文献`}
            expanded={expandedSections.has('comparison')}
            onToggle={() => toggleSection('comparison')}
          >
            <div className="space-y-3">
              {result.review.comparison_with_prior_work?.map((comp, i) => {
                const relConfig = RELATION_CONFIG[comp.relation] || RELATION_CONFIG.complementary;
                return (
                  <div key={i} className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-medium text-white leading-snug flex-1">
                        {comp.title || comp.paper_title}
                      </h4>
                      <span className={`text-[10px] ${relConfig.color} ${relConfig.bg} px-1.5 py-0.5 rounded flex-shrink-0`}>
                        {relConfig.label}
                      </span>
                    </div>
                    {comp.authors && (
                      <p className="text-xs text-zinc-500 mb-1.5">
                        {formatAuthors(comp.authors)} {comp.year && `(${comp.year})`}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase">類似点</span>
                        <p className="text-xs text-zinc-400 mt-0.5">{comp.similarity}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase">相違点</span>
                        <p className="text-xs text-zinc-400 mt-0.5">{comp.difference}</p>
                      </div>
                    </div>
                    {comp.doi && (
                      <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-white/5">
                        {comp.pdf_url && (
                          <a href={comp.pdf_url} target="_blank" rel="noopener noreferrer"
                             className="text-[10px] text-zinc-500 hover:text-green-400 flex items-center gap-1">
                            <BookOpen size={9} /> PDF
                          </a>
                        )}
                        <a href={`https://doi.org/${comp.doi}`} target="_blank" rel="noopener noreferrer"
                           className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                          <ExternalLink size={9} /> DOI
                        </a>
                        {comp.citation_count !== undefined && (
                          <span className="text-[10px] text-zinc-600">
                            被引用: {formatNumber(comp.citation_count)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Strengths */}
          <CollapsibleSection
            id="strengths"
            icon={ThumbsUp}
            iconColor="text-green-400"
            title="強み"
            subtitle={`${result.review.strengths?.length || 0} 点`}
            expanded={expandedSections.has('strengths')}
            onToggle={() => toggleSection('strengths')}
          >
            <div className="space-y-2">
              {result.review.strengths?.map((s, i) => (
                <div key={i} className="bg-green-500/5 border border-green-500/10 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-green-400 mb-1">{s.point}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">{s.explanation}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Improvements */}
          <CollapsibleSection
            id="improvements"
            icon={Wrench}
            iconColor="text-orange-400"
            title="改善提案"
            subtitle={`${result.review.improvements?.length || 0} 点`}
            expanded={expandedSections.has('improvements')}
            onToggle={() => toggleSection('improvements')}
          >
            <div className="space-y-2">
              {result.review.improvements?.map((imp, i) => {
                const prioConfig = PRIORITY_CONFIG[imp.priority] || PRIORITY_CONFIG.medium;
                return (
                  <div key={i} className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-white flex-1">{imp.point}</h4>
                      <span className={`text-[10px] ${prioConfig.color} ${prioConfig.bg} px-1.5 py-0.5 rounded`}>
                        {prioConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{imp.explanation}</p>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Papers to Cite */}
          <CollapsibleSection
            id="citations"
            icon={BookMarked}
            iconColor="text-blue-400"
            title="引用すべき文献"
            subtitle={`${result.review.papers_to_cite?.length || 0} 件`}
            expanded={expandedSections.has('citations')}
            onToggle={() => toggleSection('citations')}
          >
            <div className="space-y-2">
              {result.review.papers_to_cite?.map((cite, i) => (
                <div key={i} className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-white leading-snug mb-1">
                    {cite.title || cite.paper_title}
                  </h4>
                  {cite.authors && (
                    <p className="text-xs text-zinc-500 mb-1">
                      {formatAuthors(cite.authors)} {cite.year && `(${cite.year})`}
                      {cite.venue && ` -- ${cite.venue}`}
                    </p>
                  )}
                  <p className="text-xs text-blue-400/80 leading-relaxed">
                    <span className="font-medium">引用理由: </span>{cite.reason}
                  </p>
                  {cite.doi && (
                    <div className="flex items-center gap-2 mt-1.5 pt-1 border-t border-white/5">
                      {cite.pdf_url && (
                        <a href={cite.pdf_url} target="_blank" rel="noopener noreferrer"
                           className="text-[10px] text-zinc-500 hover:text-green-400 flex items-center gap-1">
                          <BookOpen size={9} /> PDF
                        </a>
                      )}
                      <a href={`https://doi.org/${cite.doi}`} target="_blank" rel="noopener noreferrer"
                         className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                        <ExternalLink size={9} /> DOI
                      </a>
                      {cite.citation_count !== undefined && (
                        <span className="text-[10px] text-zinc-600">
                          被引用: {formatNumber(cite.citation_count)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Overall Assessment */}
          <CollapsibleSection
            id="assessment"
            icon={MessageSquare}
            iconColor="text-cyan-400"
            title="総合評価"
            expanded={expandedSections.has('assessment')}
            onToggle={() => toggleSection('assessment')}
          >
            <p className="text-sm text-zinc-300 leading-relaxed">
              {result.review.overall_assessment}
            </p>
          </CollapsibleSection>

          {/* Search queries used */}
          <details className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg">
            <summary className="p-3 text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">
              使用した検索クエリを表示（{result.related_papers_count} 件の関連文献を検索）
            </summary>
            <div className="px-3 pb-3 space-y-1">
              {result.search_queries?.map((sq, i) => (
                <div key={i} className="text-xs text-zinc-500 flex items-start gap-2">
                  <span className="text-zinc-400 font-mono flex-1">{sq.query}</span>
                  <span className="text-zinc-600 flex-shrink-0">-- {sq.purpose}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  id,
  icon: Icon,
  iconColor,
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-4 hover:bg-zinc-800/80 transition-colors rounded-lg"
      >
        <Icon size={16} className={iconColor} />
        <h3 className="text-sm font-medium text-white">{title}</h3>
        {subtitle && <span className="text-xs text-zinc-500">{subtitle}</span>}
        <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">AI生成</span>
        <ChevronDown
          size={14}
          className={`ml-auto text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
