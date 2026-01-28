import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Conexão direta
import { useAuth } from '../contexts/AuthContext';
import { Hash, Send, Clock, User } from 'lucide-react';

export default function ChannelView({ channels = [] }) {
  const { channelId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Encontra o nome do canal atual
  const currentChannel = channels.find(c => c.id === channelId);

  useEffect(() => {
    if (channelId) {
      fetchMessages();
      // Inscreve para receber mensagens novas em tempo real (Supabase Realtime)
      const subscription = supabase
        .channel(`public:messages:channel_id=eq.${channelId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, payload => {
           // Quando chega mensagem nova, adiciona na lista
           fetchMessages(); // Recarrega para garantir os dados do usuário (join)
        })
        .subscribe();

      return () => { supabase.removeChannel(subscription); };
    }
  }, [channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function fetchMessages() {
    setLoading(true);
    try {
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*, profiles(full_name, avatar_url)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(msgs || []);
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const text = newMessage;
      setNewMessage(''); // Limpa input rápido

      const { error } = await supabase.from('messages').insert([{
        content: text,
        channel_id: channelId,
        user_id: user.id
      }]);

      if (error) throw error;
      // O Realtime vai atualizar a tela, ou chamamos fetchMessages()
      fetchMessages();
    } catch (error) {
      console.error("Erro ao enviar:", error);
      alert("Erro ao enviar mensagem");
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!currentChannel) return <div className="p-10 text-gray-400">Canal não encontrado ou carregando...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#121214' }}>
      {/* Header do Canal */}
      <div style={{ padding: '20px', borderBottom: '1px solid #323238', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Hash size={24} color="#8257e6" />
        <div>
          <h2 style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>{currentChannel.name}</h2>
          <p style={{ color: '#a8a8b3', fontSize: '14px' }}>{currentChannel.description || 'Bem-vindo ao canal #' + currentChannel.name}</p>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id;
          const displayName = isMe ? 'Você' : (msg.profiles?.full_name || 'Usuário');
          const avatarUrl = msg.profiles?.avatar_url;
          return (
            <div key={msg.id} style={{ display: 'flex', gap: '15px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: isMe ? '#8257e6' : '#323238', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={20} color="white" />
                )}
              </div>
              <div style={{ maxWidth: '70%' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 5, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>{displayName}</span>
                  <span style={{ color: '#7c7c8a', fontSize: 12 }}>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div style={{ 
                  background: isMe ? '#8257e6' : '#202024', 
                  color: 'white', 
                  padding: '10px 15px', 
                  borderRadius: '8px', 
                  fontSize: '15px',
                  lineHeight: '1.4'
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Envio */}
      <div style={{ padding: '20px' }}>
        <form onSubmit={handleSendMessage} style={{ background: '#202024', borderRadius: '8px', padding: '10px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #323238' }}>
          <input
            type="text"
            placeholder={`Conversar em #${currentChannel.name}`}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none', padding: '5px' }}
          />
          <button type="submit" disabled={!newMessage.trim()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: newMessage.trim() ? '#8257e6' : '#555' }}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}