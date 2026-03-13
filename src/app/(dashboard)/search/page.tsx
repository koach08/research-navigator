'use client';

import { SearchBar } from '@/components/search/search-bar';
import { PaperCard } from '@/components/search/paper-card';
import { useSearch } from '@/hooks/use-search';
import { useProjects } from '@/hooks/use-projects';
import { Search as SearchIcon, AlertCircle } from 'lucide-react';

export default function SearchPage() {
  const { results, loading, total, errors, search, addToProject, summarize } = useSearch();
  const { projects } = useProjects();

  const handleSearch = (query: string, options: {
    sources: string[];
    yearFrom?: number;
    yearTo?: number;
  }) => {
    search(query, options);
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-xl font-bold text-white mb-4">統合文献検索</h2>

      <SearchBar onSearch={handleSearch} loading={loading} />

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-4 space-y-2">
          {errors.map((err, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
              <AlertCircle size={12} />
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-400">
              {results.length} 件表示（推定 {total.toLocaleString()} 件中）
            </p>
          </div>

          <div className="space-y-3">
            {results.map((paper, i) => (
              <PaperCard
                key={`${paper.doi || paper.semantic_scholar_id || paper.openalex_id || i}`}
                paper={paper}
                projects={projects}
                onAddToProject={addToProject}
                onSummarize={summarize}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && (
        <div className="mt-16 text-center">
          <SearchIcon size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">
            キーワードを入力して文献を検索してください
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Semantic Scholar, OpenAlex, CiNii から同時に検索します
          </p>
        </div>
      )}
    </div>
  );
}
