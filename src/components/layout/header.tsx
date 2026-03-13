'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, User, Save, Power, Check, Cloud, CloudOff } from 'lucide-react';

export function Header() {
  const { user, signOut } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [online, setOnline] = useState(true);

  // Check connection status
  useEffect(() => {
    const check = () => setOnline(navigator.onLine);
    window.addEventListener('online', check);
    window.addEventListener('offline', check);
    return () => {
      window.removeEventListener('online', check);
      window.removeEventListener('offline', check);
    };
  }, []);

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/app/export', {
        headers: { 'x-user-id': user.id },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-navigator-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Export failed:', err);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleQuit = async () => {
    if (!user) return;
    // Save before quit
    try {
      await fetch('/api/app/shutdown', {
        method: 'POST',
        headers: { 'x-user-id': user.id },
      });
    } catch {
      // Server shutting down
    }
    window.close();
    // Fallback if window.close doesn't work
    setTimeout(() => {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#09090b;color:#71717a;font-family:sans-serif;"><div style="text-align:center"><p style="font-size:18px;margin-bottom:8px">Research Navigator を終了しました</p><p style="font-size:13px">このタブを閉じてください</p></div></div>';
    }, 600);
  };

  return (
    <header className="h-11 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 select-none">
      {/* Left */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-600 font-medium">Research Navigator</span>
        <span className="flex items-center gap-1 text-[10px] text-zinc-600">
          {online ? (
            <><Cloud size={10} className="text-green-500" /> 自動保存中</>
          ) : (
            <><CloudOff size={10} className="text-red-400" /> オフライン</>
          )}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-zinc-600 mr-2 flex items-center gap-1">
          <User size={10} />
          {user?.email}
        </span>

        {/* Save backup */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded transition-colors ${
            saved
              ? 'text-green-400 bg-green-500/10'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          title="データをバックアップ保存（JSONファイル）"
        >
          {saved ? <Check size={12} /> : <Save size={12} />}
          {saving ? '保存中...' : saved ? '保存完了' : '保存'}
        </button>

        {/* Logout */}
        <button
          onClick={signOut}
          className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-white px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors"
          title="ログアウト"
        >
          <LogOut size={12} />
        </button>

        {/* Quit */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowQuitConfirm(!showQuitConfirm)}
            className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-red-400 px-2.5 py-1.5 rounded hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
            title="アプリを終了"
          >
            <Power size={12} />
            終了
          </button>

          {showQuitConfirm && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowQuitConfirm(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-4 w-56 z-50">
                <p className="text-sm text-zinc-200 mb-1">終了しますか？</p>
                <p className="text-[10px] text-zinc-500 mb-4">
                  データはSupabaseに自動保存されています。サーバーを停止してアプリを閉じます。
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleQuit}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-500 flex items-center justify-center gap-1.5"
                  >
                    <Power size={12} />
                    終了する
                  </button>
                  <button
                    onClick={() => setShowQuitConfirm(false)}
                    className="px-3 py-2 text-zinc-400 text-xs hover:text-white rounded-md hover:bg-zinc-700"
                  >
                    戻る
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
