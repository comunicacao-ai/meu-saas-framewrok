import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Loader2, Upload, User } from 'lucide-react';
import './Audience.css';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: '', avatar: '', cargo: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  async function fetchProfile() {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
      if (data) {
        setProfile({
          name: data.full_name ?? data.name ?? authUser.user_metadata?.name ?? authUser.email?.split('@')[0] ?? '',
          avatar: data.avatar_url ?? data.avatar ?? authUser.user_metadata?.avatar_url ?? '',
          cargo: data.role ?? data.cargo ?? ''
        });
      } else {
        setProfile({
          name: authUser.user_metadata?.name ?? authUser.email?.split('@')[0] ?? '',
          avatar: authUser.user_metadata?.avatar_url ?? '',
          cargo: ''
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('campaign-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('campaign-images').getPublicUrl(path);
      setProfile(prev => ({ ...prev, avatar: data.publicUrl }));
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar avatar.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authUser) {
        alert('Sessão inválida. Faça login novamente.');
        setSaving(false);
        return;
      }
      const payload = {
        id: authUser.id,
        full_name: profile.name || null,
        role: profile.cargo || null,
        avatar_url: profile.avatar || null,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      alert('Perfil atualizado!');
      navigate(-1);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar: ' + (err?.message ?? String(err)));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="audience-container" style={{ padding: '30px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#a8a8b3', cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 24, color: 'white', margin: 0 }}>Editar perfil</h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a8a8b3' }}>
          <Loader2 size={20} className="spin" /> Carregando...
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, color: '#a8a8b3', marginBottom: 8, fontWeight: 500 }}>Avatar</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 80, height: 80, borderRadius: '50%', background: '#202024', border: '2px dashed #323238',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden'
                }}
              >
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={32} color="#7c7c8a" />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: '#29292e', border: '1px solid #323238', color: '#e1e1e6', padding: '8px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Upload size={14} /> Enviar foto
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, color: '#a8a8b3', marginBottom: 8, fontWeight: 500 }}>Nome</label>
            <input
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              style={{ width: '100%', padding: 12, background: '#202024', border: '1px solid #323238', color: 'white', borderRadius: 6, fontSize: 14 }}
              placeholder="Seu nome"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, color: '#a8a8b3', marginBottom: 8, fontWeight: 500 }}>Cargo</label>
            <input
              value={profile.cargo}
              onChange={e => setProfile(p => ({ ...p, cargo: e.target.value }))}
              style={{ width: '100%', padding: 12, background: '#202024', border: '1px solid #323238', color: 'white', borderRadius: 6, fontSize: 14 }}
              placeholder="Ex: Desenvolvedor, Designer..."
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {saving ? <Loader2 size={16} className="spin" /> : null} Salvar
            </button>
            <button type="button" onClick={() => navigate(-1)} style={{ background: 'transparent', border: '1px solid #323238', color: '#e1e1e6', padding: '10px 20px', borderRadius: 6, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
