import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient'; 
import { Plus, Tag as TagIcon, Trash2, Loader2 } from 'lucide-react';

export default function Tags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');

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
      const { data, error } = await supabase.from('tags').insert([{ name: newTag }]).select();
      if (error) throw error;
      setTags([data[0], ...tags]);
      setNewTag('');
    } catch (error) {
      alert("Erro ao criar tag");
    }
  }

  async function handleDeleteTag(id) {
    if (!confirm('Excluir?')) return;
    try {
      await supabase.from('tags').delete().eq('id', id);
      setTags(tags.filter(t => t.id !== id));
    } catch (error) {
      alert("Erro ao excluir");
    }
  }

  return (
    <div style={{ padding: '30px', color: 'white', overflowY: 'auto', height: '100%' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Tags</h1>
      
      <form onSubmit={handleCreateTag} style={{ display: 'flex', gap: '10px', marginBottom: '30px', maxWidth: '500px' }}>
        <input 
          value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nova tag..." 
          style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#121214', border: '1px solid #323238', color: 'white' }} 
        />
        <button type="submit" style={{ padding: '0 20px', background: '#8257e6', borderRadius: '8px', border: 'none', color: 'white', cursor: 'pointer' }}><Plus /></button>
      </form>

      {loading ? <Loader2 className="spin" /> : (
        <div style={{ display: 'grid', gap: '10px', maxWidth: '500px' }}>
          {tags.map(tag => (
            <div key={tag.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#202024', borderRadius: '8px' }}>
              <div style={{display:'flex', gap:10}}><TagIcon size={18} color={tag.color}/> {tag.name}</div>
              <button onClick={() => handleDeleteTag(tag.id)} style={{background:'none', border:'none', color:'#7c7c8a', cursor:'pointer'}}><Trash2 size={18}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}