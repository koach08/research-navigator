'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProjects } from '@/hooks/use-projects';
import {
  Search,
  FolderOpen,
  TrendingUp,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  X,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export function Sidebar() {
  const pathname = usePathname();
  const { projects, createProject, deleteProject } = useProjects();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState('');
  const [newField, setNewField] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProject({
      name: newName.trim(),
      field: newField.trim() || undefined,
      color: selectedColor,
    });
    setNewName('');
    setNewField('');
    setSelectedColor(COLORS[0]);
    setShowNewProject(false);
  };

  const navItems = [
    { href: '/', label: '概要', icon: FolderOpen },
    { href: '/search', label: '検索', icon: Search },
    { href: '/advisor', label: '研究アドバイザー', icon: Sparkles },
    { href: '/review', label: '査読・レビュー', icon: ClipboardCheck },
    { href: '/trends', label: 'トレンド', icon: TrendingUp },
    { href: '/settings', label: '設定', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-white">Research Navigator</h1>
        <p className="text-xs text-zinc-500 mt-0.5">文献管理・分析ダッシュボード</p>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-0.5">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Projects */}
      <div className="flex-1 overflow-y-auto px-2 mt-4">
        <button
          onClick={() => setProjectsExpanded(!projectsExpanded)}
          className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-full hover:text-zinc-300"
        >
          {projectsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Projects
        </button>

        {projectsExpanded && (
          <div className="mt-1 space-y-0.5">
            {projects.map(project => {
              const isActive = pathname === `/projects/${project.id}`;
              return (
                <div key={project.id} className="group relative">
                  <Link
                    href={`/projects/${project.id}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate flex-1">{project.name}</span>
                    <span className="text-xs text-zinc-600">{project.paper_count || 0}</span>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm(`「${project.name}」を削除しますか？`)) {
                        deleteProject(project.id);
                      }
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}

            {/* New Project */}
            {showNewProject ? (
              <div className="px-2 py-2 space-y-2">
                <input
                  type="text"
                  placeholder="プロジェクト名"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="分野（任意）"
                  value={newField}
                  onChange={e => setNewField(e.target.value)}
                  className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
                <div className="flex gap-1">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`w-5 h-5 rounded-full border-2 ${
                        selectedColor === c ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-500"
                  >
                    作成
                  </button>
                  <button
                    onClick={() => setShowNewProject(false)}
                    className="px-2 py-1 text-zinc-400 hover:text-white text-xs"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewProject(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-md w-full"
              >
                <Plus size={14} />
                New Project
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
