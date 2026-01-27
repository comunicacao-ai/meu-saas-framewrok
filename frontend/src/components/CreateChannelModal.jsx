import { useState } from 'react';
import { X, Hash, Lock, Loader2 } from 'lucide-react';

export default function CreateChannelModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    // Chama a função que veio do pai (Sidebar -> Layout)
    await onCreate({ name, isPrivate });
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>Criar novo canal</h2>
          <button onClick={onClose} className="close-btn"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#a8a8b3', marginBottom: '8px', fontSize: '14px' }}>
              Nome do Canal
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', color: '#a8a8b3' }}>
                {isPrivate ? <Lock size={16} /> : <Hash size={16} />}
              </span>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))} // Força kebab-case
                placeholder="ex: marketing-digital"
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 35px',
                  background: '#202024',
                  border: '1px solid #323238',
                  color: 'white',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>
            <p style={{ fontSize: '12px', color: '#a8a8b3', marginTop: '5px' }}>
              Canais são onde as conversas acontecem sobre um tópico específico.
            </p>
          </div>

          <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setIsPrivate(!isPrivate)}>
            <div style={{ 
              width: '40px', 
              height: '20px', 
              background: isPrivate ? '#8257e6' : '#323238', 
              borderRadius: '20px', 
              position: 'relative',
              transition: 'all 0.2s'
            }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                background: 'white', 
                borderRadius: '50%', 
                position: 'absolute', 
                top: '2px', 
                left: isPrivate ? '22px' : '2px',
                transition: 'all 0.2s'
              }} />
            </div>
            <span style={{ color: 'white', fontSize: '14px' }}>Canal Privado</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn-cancel">Cancelar</button>
            <button type="submit" className="btn-save" disabled={loading || !name.trim()}>
              {loading ? <Loader2 className="spin" size={18} /> : 'Criar Canal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}