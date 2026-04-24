'use client';

import { useState, useEffect } from 'react';

interface Backup {
  name: string;
  size: number;
  createdAt: string;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('sv-SE', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function BackupManager() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => { fetchBackups(); }, []);

  async function fetchBackups() {
    setLoading(true);
    try {
      const res = await fetch('/api/backup');
      const data = await res.json();
      setBackups(Array.isArray(data) ? data : []);
    } catch { setMessage({ type: 'err', text: 'Kunde inte hämta backupar' }); }
    finally { setLoading(false); }
  }

  async function createBackup() {
    setCreating(true); setMessage(null);
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: 'err', text: data.error }); return; }
      setMessage({ type: 'ok', text: `✅ Backup skapad: ${data.name}` });
      fetchBackups();
    } catch { setMessage({ type: 'err', text: 'Nätverksfel' }); }
    finally { setCreating(false); }
  }

  async function deleteBackup(name: string) {
    if (!confirm(`Radera backup "${name}"?`)) return;
    await fetch(`/api/backup?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    fetchBackups();
  }

  function downloadBackup(name: string) {
    window.open(`/api/backup?download=${encodeURIComponent(name)}`, '_blank');
  }

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-serif" style={{ color: 'var(--text-primary)' }}>🗄️ Säkerhetskopiering</h3>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Max 30 backupar sparas. Filer lagras i <code className="text-xs px-1 py-0.5 rounded" style={{ background: 'var(--bg-hover)' }}>backups/</code>
          </p>
        </div>
        <button
          onClick={createBackup}
          disabled={creating}
          className="btn-primary"
        >
          {creating ? '⏳ Skapar...' : '💾 Skapa backup nu'}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded text-sm border ${message.type === 'ok'
          ? 'bg-green-500/20 text-green-300 border-green-500/30'
          : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--border-color-strong)', borderTopColor: 'var(--text-primary)' }} />
        </div>
      ) : backups.length === 0 ? (
        <div className="text-center py-6 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
          <p className="text-4xl mb-2">🗄️</p>
          <p style={{ color: 'var(--text-muted)' }}>Inga backupar ännu. Skapa din första!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {backups.map((b, i) => (
            <div key={b.name} className="flex items-center justify-between gap-4 p-3 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">
                  {i === 0 ? '🔵' : '⚪'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>{b.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {fmtDate(b.createdAt)} · {fmtSize(b.size)}
                  </p>
                </div>
                {i === 0 && (
                  <span className="text-xs px-2 py-0.5 rounded border bg-blue-500/20 text-blue-300 border-blue-500/30 shrink-0">
                    Senaste
                  </span>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => downloadBackup(b.name)}
                  className="btn-secondary text-xs py-1 px-3"
                  title="Ladda ner"
                >
                  ⬇️ Ladda ner
                </button>
                <button
                  onClick={() => deleteBackup(b.name)}
                  className="btn-secondary text-xs py-1 px-2 hover:text-red-400"
                  title="Radera"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t text-xs space-y-1" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
        <p>💡 <strong>Tips:</strong> Ladda ner backupar regelbundet och spara dem på ett externt ställe (t.ex. OneDrive eller USB).</p>
        <p>🔒 Backup-filerna är SQLite-databaser som kan öppnas med t.ex. <a href="https://sqlitebrowser.org" target="_blank" rel="noopener noreferrer" className="underline">DB Browser for SQLite</a>.</p>
      </div>
    </div>
  );
}
