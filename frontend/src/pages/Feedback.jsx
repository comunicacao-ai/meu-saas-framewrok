import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function Feedback() {
  const { campaignId, contactId, score: scoreParam } = useParams();
  const score = scoreParam != null ? parseInt(scoreParam, 10) : null;

  const [status, setStatus] = useState('loading');
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    if (!campaignId || !contactId || score == null || score < 0 || score > 10) {
      setStatus('error');
      return;
    }
    (async () => {
      try {
        const { error } = await supabase.from('campaign_responses').upsert(
          { campaign_id: campaignId, contact_id: contactId, score, comment: null },
          { onConflict: 'campaign_id,contact_id' }
        );
        if (error) throw error;
        setStatus('done');
      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    })();
  }, [campaignId, contactId, score]);

  async function handleSubmitComment(e) {
    e.preventDefault();
    if (!campaignId || !contactId) return;
    setSendingComment(true);
    try {
      const { error } = await supabase
        .from('campaign_responses')
        .update({ comment: comment.trim() || null })
        .eq('campaign_id', campaignId)
        .eq('contact_id', contactId);
      if (error) throw error;
      setComment('');
      alert('Comentário enviado. Obrigado!');
    } catch (e) {
      console.error(e);
      alert('Erro ao enviar comentário.');
    } finally {
      setSendingComment(false);
    }
  }

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#09090a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a8a8b3' }}>
        <Loader2 size={32} className="spin" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: '#09090a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ color: '#f75a68', textAlign: 'center' }}>Link inválido ou expirado.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 400, width: '100%', background: '#202024', borderRadius: 12, padding: 32, border: '1px solid #323238' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <CheckCircle size={48} color="#00B37E" style={{ marginBottom: 12 }} />
          <h1 style={{ color: 'white', fontSize: 20, marginBottom: 8 }}>Obrigado pelo feedback!</h1>
          <p style={{ color: '#a8a8b3', fontSize: 14 }}>Sua avaliação foi registrada.</p>
        </div>
        <form onSubmit={handleSubmitComment}>
          <label style={{ display: 'block', fontSize: 12, color: '#a8a8b3', marginBottom: 8 }}>Deseja deixar um comentário?</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Conte-nos mais..."
            rows={3}
            style={{ width: '100%', padding: 12, background: '#121214', border: '1px solid #323238', color: 'white', borderRadius: 6, resize: 'vertical', marginBottom: 16 }}
          />
          <button
            type="submit"
            disabled={sendingComment}
            style={{ width: '100%', padding: 12, background: '#8257e6', border: 'none', color: 'white', borderRadius: 6, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {sendingComment ? <Loader2 size={16} className="spin" /> : null} Enviar comentário
          </button>
        </form>
      </div>
    </div>
  );
}
