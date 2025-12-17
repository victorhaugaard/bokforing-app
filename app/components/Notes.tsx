'use client';

import { useState, useEffect } from 'react';

interface Note {
  id: number;
  title: string;
  content: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH'>('NORMAL');

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title);
      setContent(editingNote.content);
      setPriority(editingNote.priority);
      setShowForm(true);
    }
  }, [editingNote]);

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = editingNote !== null;
      const res = await fetch('/api/notes', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit && { id: editingNote.id, isCompleted: editingNote.isCompleted }),
          title,
          content,
          priority,
        }),
      });

      if (!res.ok) throw new Error('Kunde inte spara anteckning');

      setTitle('');
      setContent('');
      setPriority('NORMAL');
      setShowForm(false);
      setEditingNote(null);
      fetchNotes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleComplete = async (note: Note) => {
    try {
      await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...note, isCompleted: !note.isCompleted }),
      });
      fetchNotes();
    } catch (err) {
      alert('Kunde inte uppdatera anteckning');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Är du säker på att du vill radera denna anteckning?')) return;
    try {
      await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      fetchNotes();
    } catch (err) {
      alert('Kunde inte radera anteckning');
    }
  };

  const handleCancel = () => {
    setTitle('');
    setContent('');
    setPriority('NORMAL');
    setShowForm(false);
    setEditingNote(null);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30';
      case 'NORMAL': return 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30';
      case 'LOW': return 'bg-gray-500/20 text-gray-600 dark:text-gray-300 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-300 border-gray-500/30';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '🔴 Hög';
      case 'NORMAL': return '🔵 Normal';
      case 'LOW': return '⚪ Låg';
      default: return priority;
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'border-l-red-500';
      case 'NORMAL': return 'border-l-blue-500';
      default: return 'border-l-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--border-color-strong)', borderTopColor: 'var(--text-primary)' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Laddar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif" style={{ color: 'var(--text-primary)' }}>📝 Anteckningar & TODO</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? 'Stäng' : '+ Ny anteckning'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-serif" style={{ color: 'var(--text-primary)' }}>
            {editingNote ? 'Redigera anteckning' : 'Ny anteckning'}
          </h3>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="T.ex. Bokför Adobe-prenumeration"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Innehåll</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input-field"
              rows={4}
              placeholder="Beskriv vad som behöver göras..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Prioritet</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'LOW' | 'NORMAL' | 'HIGH')}
              className="select-field"
            >
              <option value="LOW">⚪ Låg</option>
              <option value="NORMAL">🔵 Normal</option>
              <option value="HIGH">🔴 Hög</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">
              {editingNote ? 'Uppdatera' : 'Skapa'}
            </button>
            <button type="button" onClick={handleCancel} className="btn-secondary">
              Avbryt
            </button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p style={{ color: 'var(--text-muted)' }}>Inga anteckningar ännu. Lägg till din första!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`glass-card p-4 border-l-4 ${getPriorityBorder(note.priority)} ${note.isCompleted ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={note.isCompleted}
                    onChange={() => handleToggleComplete(note)}
                    className="mt-1 w-5 h-5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <h3 className={`text-lg font-medium ${note.isCompleted ? 'line-through' : ''}`} style={{ color: note.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {note.title}
                    </h3>
                    <p className={`text-sm mt-1 whitespace-pre-wrap`} style={{ color: note.isCompleted ? 'var(--text-disabled)' : 'var(--text-muted)' }}>
                      {note.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-1 rounded border ${getPriorityBadge(note.priority)}`}>
                        {getPriorityLabel(note.priority)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                        {new Date(note.createdAt).toLocaleDateString('sv-SE')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setEditingNote(note)} style={{ color: 'var(--text-muted)' }} className="hover:opacity-75" title="Redigera">
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(note.id)} className="hover:text-red-500" style={{ color: 'var(--text-muted)' }} title="Radera">
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
