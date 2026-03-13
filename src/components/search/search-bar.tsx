'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string, options: {
    sources: string[];
    yearFrom?: number;
    yearTo?: number;
  }) => void;
  loading: boolean;
}

const SOURCES = [
  { id: 'semantic_scholar', label: 'Semantic Scholar' },
  { id: 'openalex', label: 'OpenAlex' },
  { id: 'cinii', label: 'CiNii' },
];

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState<string[]>(['semantic_scholar', 'openalex', 'cinii']);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim(), {
      sources,
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined,
    });
  };

  const toggleSource = (id: string) => {
    setSources(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="論文を検索... (例: AI journalism media literacy)"
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          検索
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg text-sm hover:text-white hover:border-zinc-600"
        >
          フィルタ
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-4 p-3 bg-zinc-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">ソース:</span>
            {SOURCES.map(src => (
              <label key={src.id} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sources.includes(src.id)}
                  onChange={() => toggleSource(src.id)}
                  className="rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-xs text-zinc-300">{src.label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">年:</span>
            <input
              type="number"
              value={yearFrom}
              onChange={e => setYearFrom(e.target.value)}
              placeholder="From"
              className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
            />
            <span className="text-zinc-600">〜</span>
            <input
              type="number"
              value={yearTo}
              onChange={e => setYearTo(e.target.value)}
              placeholder="To"
              className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </form>
  );
}
