'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { CitationGraph } from '@/components/network/citation-graph';
import Link from 'next/link';
import {
  Loader2,
  Network,
  RefreshCw,
  GitBranch,
  Info,
} from 'lucide-react';

interface GraphNode {
  id: string;
  title: string;
  year?: number;
  citation_count: number;
  authors?: { name: string }[];
  in_project: boolean;
  doi?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  context_type?: string;
}

export default function NetworkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanding, setExpanding] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const fetchGraph = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/citation-graph?project_id=${id}`, {
        headers: { 'x-user-id': user.id },
      });
      const json = await res.json();
      if (json.data) {
        setNodes(json.data.nodes || []);
        setEdges(json.data.edges || []);
      }
    } catch (err) {
      console.error('Failed to fetch graph:', err);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const expandPaper = async (ssId: string) => {
    if (!user || expanding) return;
    setExpanding(true);
    try {
      await fetch('/api/search/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          semantic_scholar_id: ssId,
          direction: 'both',
          depth: 1,
        }),
      });
      // Refresh graph
      await fetchGraph();
    } catch (err) {
      console.error('Expand failed:', err);
    } finally {
      setExpanding(false);
    }
  };

  // Get project papers with semantic_scholar_id for expand
  const [projectPapers, setProjectPapers] = useState<{ id: string; title: string; semantic_scholar_id?: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/projects/${id}/papers`, { headers: { 'x-user-id': user.id } })
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setProjectPapers(
            json.data.map((pp: { paper: { id: string; title: string; semantic_scholar_id?: string } }) => ({
              id: pp.paper.id,
              title: pp.paper.title,
              semantic_scholar_id: pp.paper.semantic_scholar_id,
            }))
          );
        }
      });
  }, [user, id]);

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${id}`} className="text-sm text-zinc-500 hover:text-white">
            ← 文献一覧
          </Link>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Network size={18} />
            引用ネットワーク
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {expanding && (
            <span className="text-xs text-blue-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              拡張中...
            </span>
          )}
          <button
            onClick={fetchGraph}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800"
          >
            <RefreshCw size={12} />
            更新
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-zinc-500" size={24} />
        </div>
      ) : nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Network size={40} className="text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-400">引用ネットワークデータがありません</p>
          <p className="text-xs text-zinc-500 mt-1">
            以下の論文から引用関係を展開してネットワークを構築できます
          </p>

          {projectPapers.filter(p => p.semantic_scholar_id).length > 0 && (
            <div className="mt-4 space-y-1 max-w-md">
              {projectPapers.filter(p => p.semantic_scholar_id).slice(0, 5).map(p => (
                <button
                  key={p.id}
                  onClick={() => expandPaper(p.semantic_scholar_id!)}
                  disabled={expanding}
                  className="w-full text-left text-xs text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded px-3 py-2 flex items-center gap-2 disabled:opacity-50"
                >
                  <GitBranch size={12} className="text-blue-400 flex-shrink-0" />
                  <span className="truncate">{p.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-4 h-full">
          {/* Graph */}
          <div className="flex-1 h-full">
            <CitationGraph
              nodes={nodes}
              edges={edges}
              onNodeClick={(node) => setSelectedNode(node)}
            />
          </div>

          {/* Sidebar - selected node info */}
          {selectedNode && (
            <div className="w-64 bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                  <Info size={12} />
                  論文詳細
                </h4>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-zinc-600 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
              <h3 className="text-sm font-medium text-white leading-snug mb-2">
                {selectedNode.title}
              </h3>
              <div className="space-y-1 text-xs text-zinc-400">
                {selectedNode.year && <p>年: {selectedNode.year}</p>}
                <p>被引用: {selectedNode.citation_count}</p>
                {selectedNode.doi && (
                  <a
                    href={`https://doi.org/${selectedNode.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 block"
                  >
                    DOI →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {nodes.length > 0 && (
        <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-600">
          <span>ノード: {nodes.length}</span>
          <span>エッジ: {edges.length}</span>
          <span>プロジェクト内: {nodes.filter(n => n.in_project).length}</span>
        </div>
      )}
    </div>
  );
}
