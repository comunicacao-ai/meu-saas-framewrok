import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Loader2, AlertTriangle, Send, MessageSquare, Star } from 'lucide-react';

// Importando o CSS bonito
import './Feedback.css'; 

export default function Feedback() {
  const params = useParams();
  const { campaignId, contactId, score: scoreParam } = params;
  const score = scoreParam != null ? parseInt(scoreParam, 10) : null;

  const [status, setStatus] = useState('loading');
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Mantemos a lógica interna para evitar erros de banco, mas não mostramos mais na tela
  const isPreview = String(campaignId).includes('preview') || String(contactId).includes('preview');

  useEffect(() => {
    if (!campaignId || !contactId || score == null) {
      setStatus('error');
      return;
    }

    if (isPreview) {
      // Simula sucesso rápido se for teste
      setTimeout(() => setStatus('success'), 800);
      return;
    }

    (async () => {
      try {
        const { error } = await supabase.from('campaign_responses').upsert(
          { campaign_id: campaignId, contact_id: contactId, score, updated_at: new Date() },
          { onConflict: 'campaign_id,contact_id' }
        );
        if (error) throw error;
        setStatus('success');
      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    })();
  }, [campaignId, contactId, score, isPreview]);

  async function handleSubmitComment(e) {
    e.preventDefault();
    setSendingComment(true);
    
    if (isPreview) {
        setTimeout(() => { 
            setComment(''); 
            alert('Agradecemos pelo feedback!'); 
            setSendingComment(false); 
        }, 1000);
        return;
    }

    try {
      const { error } = await supabase.from('campaign_responses').update({ comment: comment.trim() || null }).eq('campaign_id', campaignId).eq('contact_id', contactId);
      if (error) throw error;
      setComment('');
      alert('Enviado com sucesso!');
    } catch (e) { alert('Erro ao enviar.'); } finally { setSendingComment(false); }
  }

  // TELA DE CARREGAMENTO
  if (status === 'loading') {
    return (
        <div className="feedback-container">
            <div className="bg-light-purple"></div>
            <div className="bg-light-green"></div>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:15, zIndex:20, color:'white'}}>
                <Loader2 size={48} className="spin" style={{color:'#8257e6', animation:'spin 1s linear infinite'}} />
                <p style={{color:'#a8a8b3'}}>Carregando...</p>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
  }

  // TELA DE ERRO
  if (status === 'error') {
    return (
      <div className="feedback-container">
        <div className="glass-card" style={{padding:40, alignItems:'center', textAlign:'center'}}>
            <AlertTriangle size={40} color="#f75a68" style={{marginBottom:20}} />
            <h1 className="title">Link Inválido</h1>
            <p className="subtitle">Não conseguimos encontrar essa votação.</p>
        </div>
      </div>
    );
  }

  // TELA FINAL (SUCESSO)
  return (
    <div className="feedback-container">
      {/* Luzes de fundo */}
      <div className="bg-light-purple"></div>
      <div className="bg-light-green"></div>

      <div className="glass-card">
        
        {/* Header - REMOVIDO A DIV DO PREVIEW */}
        <div className="card-header">
            
            <div className="score-circle">
                <div className="score-inner">
                     <span className="score-number">{score}</span>
                     <Star size={20} fill="#EAB308" color="#EAB308" style={{position:'absolute', bottom:20, right:15}} />
                </div>
            </div>
            
            <h1 className="title">Agradecemos pelo feedback!</h1>
            <p className="subtitle">Sua resposta foi salva com sucesso.</p>
        </div>

        {/* Formulário */}
        <div className="card-body">
            <form onSubmit={handleSubmitComment}>
                <label className="label-text">
                    <MessageSquare size={14} color="#8257e6"/> 
                    Deseja complementar?
                </label>
                <textarea
                    className="input-area"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Escreva aqui (opcional)..."
                    rows={4}
                />
                
                <button type="submit" disabled={sendingComment} className="btn-submit">
                    {sendingComment ? <Loader2 size={20} style={{animation:'spin 1s linear infinite'}} /> : <Send size={18} />}
                    Enviar Comentário
                </button>
            </form>
        </div>
        
        {/* Footer */}
        <div className="card-footer">
             <p className="footer-text">Powered by Framework Digital</p>
        </div>
      </div>
      
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}