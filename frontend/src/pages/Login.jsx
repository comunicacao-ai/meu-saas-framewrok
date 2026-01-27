import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ArrowRight, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Estado para mensagens visuais
  const [msg, setMsg] = useState({ type: '', text: '' }); 

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMsg({ type: 'error', text: 'Preencha e-mail e senha!' });
      return;
    }

    setLoading(true);
    setMsg({ type: '', text: '' });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Tratamento específico para e-mail não confirmado
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Você precisa confirmar seu e-mail antes de entrar!');
        }
        if (error.message.includes('Invalid login')) {
          throw new Error('E-mail ou senha incorretos.');
        }
        throw error;
      }

      navigate('/'); // Login sucesso -> vai pro Chat
    } catch (error) {
      console.error(error);
      setMsg({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setMsg({ type: 'error', text: 'Preencha e-mail e senha para criar conta!' });
      return;
    }
    
    setLoading(true);
    setMsg({ type: '', text: '' });

    try {
      // Tenta criar o usuário
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Isso garante que o link de confirmação volte para sua página de login
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      // CENÁRIO 1: Segurança Ativada (O que você quer)
      // O usuário foi criado, mas session é null porque falta confirmar o e-mail.
      if (data.user && !data.session) {
        setMsg({ 
          type: 'success', 
          text: 'Cadastro iniciado! Um link de confirmação foi enviado para o seu e-mail. Clique nele para ativar sua conta.' 
        });
        // Limpa os campos para forçar o usuário a ir no e-mail
        setEmail('');
        setPassword('');
      } 
      // CENÁRIO 2: Segurança Desativada (Login automático)
      else if (data.session) {
        navigate('/');
      }

    } catch (error) {
      console.error(error);
      // Tratamento para usuário que já existe
      if (error.message.includes('already registered')) {
         setMsg({ type: 'error', text: 'Este e-mail já está cadastrado. Tente fazer login.' });
      } else {
         setMsg({ type: 'error', text: 'Erro ao criar: ' + error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#121214', color: '#e1e1e6'
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', padding: '40px', backgroundColor: '#202024',
        borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#8257e6' }}>Bem-vindo</h1>
          <p style={{ color: '#a8a8b3', marginTop: '5px' }}>Entre ou crie sua conta</p>
        </div>

        {/* FEEDBACK VISUAL DE MENSAGENS */}
        {msg.text && (
          <div style={{
            padding: '15px',
            marginBottom: '20px',
            borderRadius: '6px',
            fontSize: '14px',
            lineHeight: '1.4',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'start',
            gap: '10px',
            backgroundColor: msg.type === 'error' ? 'rgba(247, 90, 104, 0.1)' : 'rgba(0, 179, 126, 0.1)',
            border: `1px solid ${msg.type === 'error' ? '#f75a68' : '#00b37e'}`,
            color: 'white'
          }}>
            {msg.type === 'error' ? <AlertCircle size={20} color="#f75a68" /> : <CheckCircle size={20} color="#00b37e" />}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={{ position: 'relative' }}>
            <Mail size={20} color="#7c7c8a" style={{ position: 'absolute', left: 12, top: 12 }} />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={20} color="#7c7c8a" style={{ position: 'absolute', left: 12, top: 12 }} />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading} style={primaryBtnStyle}>
            {loading ? <Loader2 className="spin" size={20} /> : <>Entrar <ArrowRight size={20}/></>}
          </button>

          <div style={{display:'flex', alignItems:'center', gap:10, margin:'10px 0'}}>
             <div style={{flex:1, height:1, background:'#323238'}}></div>
             <span style={{color:'#7c7c8a', fontSize:12}}>OU</span>
             <div style={{flex:1, height:1, background:'#323238'}}></div>
          </div>

          <button type="button" onClick={handleSignUp} disabled={loading} style={secondaryBtnStyle}>
            <UserPlus size={16}/> Criar conta nova
          </button>

        </form>
      </div>
    </div>
  );
}

// Estilos rápidos para manter o código limpo
const inputStyle = {
  width: '100%', padding: '12px 12px 12px 45px', backgroundColor: '#121214',
  border: '1px solid #323238', borderRadius: '6px', color: 'white', outline: 'none'
};

const primaryBtnStyle = {
  marginTop: '10px', padding: '12px', backgroundColor: '#8257e6', color: 'white',
  border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: '0.2s'
};

const secondaryBtnStyle = {
  padding: '12px', backgroundColor: 'transparent', color: '#a8a8b3',
  border: '1px solid #323238', borderRadius: '6px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px'
};