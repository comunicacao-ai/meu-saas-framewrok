import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Plus, Tag as TagIcon, Trash2, Loader2, Pencil, Check, X } from 'lucide-react';

export default function Tags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [newColor, setNewColor] = useState('#8257e6');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#8257e6');

  useEffect(() => { fetchTags(); }, []);

  async function fetchTags() {
    try {
      const { data, error } = await supabase.from('tags').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error("Erro ao buscar tags:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTag(e) {
    e.preventDefault();
    if (!newTag.trim()) return;
    try {
      const { data, error } = await supabase.from('tags').insert([{ name: newTag.trim(), color: newColor || '#000000' }]).select();
      if (error) throw error;
      setTags([data[0], ...tags]);
      setNewTag('');
      setNewColor('#8257e6');
    } catch (error) {
      alert("Erro ao criar tag");
    }
  }

  function startEdit(tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || '#8257e6');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditColor('#8257e6');
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    try {
      const { error } = await supabase.from('tags').update({ name: editName.trim(), color: editColor || '#000000' }).eq('id', editingId);
      if (error) throw error;
      setTags(tags.map(t => t.id === editingId ? { ...t, name: editName.trim(), color: editColor } : t));
      cancelEdit();
    } catch (error) {
      alert("Erro ao atualizar tag");
    }
  }

  async function handleDeleteTag(id) {
    if (!confirm('Excluir?')) return;
    try {
      await supabase.from('tags').delete().eq('id', id);
      setTags(tags.filter(t => t.id !== id));
      if (editingId === id) cancelEdit();
    } catch (error) {
      alert("Erro ao excluir");
    }
  }

  return (
    <div style={{ padding: '30px', color: 'white', overflowY: 'auto', height: '100%' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Tags</h1>

      <form onSubmit={handleCreateTag} style={{ display: 'flex', gap: '10px', marginBottom: '30px', maxWidth: '500px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          placeholder="Nova tag..."
          style={{ flex: '1 1 140px', minWidth: 120, padding: '12px', borderRadius: '8px', background: '#121214', border: '1px solid #323238', color: 'white' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#a8a8b3' }}>Cor</label>
          <input
            type="color"
            value={newColor}
            onChange={e => setNewColor(e.target.value)}
            style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            title="Cor da tag"
          />
        </div>
        <button type="submit" style={{ padding: '0 20px', background: '#8257e6', borderRadius: '8px', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Plus size={18} />
        </button>
      </form>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a8a8b3' }}>
          <Loader2 className="spin" size={18} /> Carregando...
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px', maxWidth: '500px' }}>
          {tags.map(tag => (
            <div
              key={tag.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                background: '#202024',
                borderRadius: '8px',
                border: '1px solid #323238',
              }}
            >
              {editingId === tag.id ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', background: '#121214', border: '1px solid #323238', color: 'white', borderRadius: 6 }}
                      placeholder="Nome"
                    />
                    <input
                      type="color"
                      value={editColor}
                      onChange={e => setEditColor(e.target.value)}
                      style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={saveEdit} style={{ background: '#00B37E', border: 'none', color: 'white', padding: 8, borderRadius: 6, cursor: 'pointer' }}><Check size={16} /></button>
                    <button onClick={cancelEdit} style={{ background: '#323238', border: 'none', color: 'white', padding: 8, borderRadius: 6, cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 500,
                        backgroundColor: tag.color || '#8257e6',
                        color: '#fff',
                      }}
                    >
                      <TagIcon size={14} /> {tag.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(tag)} style={{ background: 'none', border: 'none', color: '#7c7c8a', cursor: 'pointer' }} title="Editar"><Pencil size={16} /></button>
                    <button onClick={() => handleDeleteTag(tag.id)} style={{ background: 'none', border: 'none', color: '#7c7c8a', cursor: 'pointer' }} title="Excluir"><Trash2 size={16} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
