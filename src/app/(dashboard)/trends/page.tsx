'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  TrendingUp,
  Plus,
  Loader2,
  X,
  ExternalLink,
  BarChart3,
  Flame,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Monitor {
  id: string;
  field_name: string;
  keywords: string[];
  is_active: boolean;
}

interface TrendData {
  topic: string;
  year_counts: { year: number; count: number }[];
  growth_rate: number;
  top_papers: {
    title: string;
    year: number;
    cited_by_count: number;
    doi?: string;
    authors: string[];
    is_open_access: boolean;
    oa_url?: string;
    venue?: string;
  }[];
  related_topics: { name: string; count: number }[];
  total_recent: number;
}

export default function TrendsPage() {
  const { user } = useAuth();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newField, setNewField] = useState('');
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMonitors, setLoadingMonitors] = useState(true);

  const fetchMonitors = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/trends/monitors', {
        headers: { 'x-user-id': user.id },
      });
      const json = await res.json();
      if (json.data) setMonitors(json.data);
    } catch (err) {
      console.error('Failed to fetch monitors:', err);
    } finally {
      setLoadingMonitors(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  const addMonitor = async () => {
    if (!user || !newField.trim()) return;
    const res = await fetch('/api/trends/monitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ field_name: newField.trim() }),
    });
    const json = await res.json();
    if (json.data) {
      setMonitors(prev => [json.data, ...prev]);
      setNewField('');
      setShowAdd(false);
      // Auto-select and fetch
      setSelectedMonitor(json.data);
      fetchTrend(json.data.field_name);
    }
  };

  const deleteMonitor = async (id: string) => {
    if (!user) return;
    await fetch('/api/trends/monitors', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ id }),
    });
    setMonitors(prev => prev.filter(m => m.id !== id));
    if (selectedMonitor?.id === id) {
      setSelectedMonitor(null);
      setTrendData(null);
    }
  };

  const fetchTrend = async (topic: string) => {
    if (!user) return;
    setLoading(true);
    setTrendData(null);
    try {
      const res = await fetch(`/api/trends?topic=${encodeURIComponent(topic)}`, {
        headers: { 'x-user-id': user.id },
      });
      const json = await res.json();
      if (json.data) setTrendData(json.data);
    } catch (err) {
      console.error('Failed to fetch trend:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectMonitor = (monitor: Monitor) => {
    setSelectedMonitor(monitor);
    fetchTrend(monitor.field_name);
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={20} />
            トレンドモニタリング
          </h2>
          <p className="text-xs text-zinc-500 mt-1">分野ごとの研究トレンドを追跡</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left: Monitor list */}
        <div className="w-56 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase">モニター</h3>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="text-zinc-500 hover:text-white p-0.5"
            >
              <Plus size={14} />
            </button>
          </div>

          {showAdd && (
            <div className="mb-3 space-y-2">
              <input
                type="text"
                value={newField}
                onChange={e => setNewField(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMonitor()}
                placeholder="例: AI journalism"
                className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex gap-1">
                <button
                  onClick={addMonitor}
                  className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-500"
                >
                  追加
                </button>
                <button
                  onClick={() => { setShowAdd(false); setNewField(''); }}
                  className="px-2 py-1 text-zinc-400 text-xs hover:text-white"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {loadingMonitors ? (
            <Loader2 size={16} className="animate-spin text-zinc-500 mx-auto mt-4" />
          ) : monitors.length === 0 ? (
            <p className="text-xs text-zinc-600 mt-2">
              「+」ボタンで分野を追加してトレンドを追跡
            </p>
          ) : (
            <div className="space-y-0.5">
              {monitors.map(m => (
                <div key={m.id} className="group relative">
                  <button
                    onClick={() => selectMonitor(m)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedMonitor?.id === m.id
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    <BarChart3 size={12} className="inline mr-1.5" />
                    {m.field_name}
                  </button>
                  <button
                    onClick={() => deleteMonitor(m.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Trend data */}
        <div className="flex-1 min-w-0">
          {!selectedMonitor && !loading && (
            <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-12 text-center">
              <TrendingUp size={40} className="text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">左のモニターを選択してトレンドを表示</p>
              <p className="text-xs text-zinc-500 mt-1">
                「+」ボタンで研究分野を追加してください
              </p>
            </div>
          )}

          {loading && (
            <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-12 text-center">
              <Loader2 size={24} className="animate-spin text-blue-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">トレンドデータを取得中...</p>
            </div>
          )}

          {trendData && !loading && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{trendData.topic}</h3>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${
                    trendData.growth_rate > 0 ? 'text-green-400' : trendData.growth_rate < 0 ? 'text-red-400' : 'text-zinc-400'
                  }`}>
                    {trendData.growth_rate > 0 ? '↑' : trendData.growth_rate < 0 ? '↓' : '→'}
                    {Math.abs(trendData.growth_rate)}% 成長率
                  </span>
                  <button
                    onClick={() => fetchTrend(trendData.topic)}
                    className="text-zinc-500 hover:text-white p-1"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Publication count chart */}
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">年別出版数</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData.year_counts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '6px', fontSize: '12px' }}
                        labelStyle={{ color: '#fafafa' }}
                        itemStyle={{ color: '#3b82f6' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top papers */}
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-1.5">
                  <Flame size={14} className="text-amber-400" />
                  注目論文（直近3年・被引用数順）
                </h4>
                <div className="space-y-2">
                  {trendData.top_papers.map((paper, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-zinc-700/30 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white leading-snug">{paper.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                          <span>{paper.authors.slice(0, 2).join(', ')}{paper.authors.length > 2 ? ' et al.' : ''}</span>
                          <span>({paper.year})</span>
                          {paper.venue && <span className="truncate max-w-[150px]">• {paper.venue}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-medium text-amber-400">
                          被引用 {paper.cited_by_count}
                        </span>
                        <span className={`text-[10px] px-1 py-0.5 rounded ${
                          paper.is_open_access ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {paper.is_open_access ? 'OA' : '有料'}
                        </span>
                        {paper.doi && (
                          <a
                            href={`https://doi.org/${paper.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-blue-400"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {paper.oa_url && (
                          <a
                            href={paper.oa_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-green-400"
                          >
                            <BookOpen size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related topics */}
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">関連トピック</h4>
                <div className="flex flex-wrap gap-1.5">
                  {trendData.related_topics.map((topic, i) => {
                    const maxCount = trendData.related_topics[0]?.count || 1;
                    const opacity = 0.3 + (topic.count / maxCount) * 0.7;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          // Search this topic
                          fetchTrend(topic.name);
                        }}
                        className="text-xs border border-blue-500/20 rounded-full px-2.5 py-1 hover:border-blue-500/40 transition-colors"
                        style={{ color: `rgba(96, 165, 250, ${opacity})`, backgroundColor: `rgba(59, 130, 246, ${opacity * 0.1})` }}
                      >
                        {topic.name}
                        <span className="ml-1 text-zinc-600">({topic.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
