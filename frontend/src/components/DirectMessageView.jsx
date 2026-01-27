import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Message from './Message';
import { Send, User, MessageCircle } from 'lucide-react';

export default function DirectMessageView({ users, onLoadConversations }) {
  const { userId } = useParams();
  const { socket } = useSocket();
  const { user: currentUser } = useAuth();
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const foundUser = users.find(u => u.id === userId);
    setOtherUser(foundUser);

    if (userId) {
      loadMessages();
    }
  }, [userId, users]);

  useEffect(() => {
    if (!socket || !userId) return;

    socket.emit('dm:presence', { otherUserId: userId });

    // Listener de novas mensagens
    const handleNewMessage = (message) => {
      if (
        (message.senderId === userId && message.receiverId === currentUser.id) ||
        (message.senderId === currentUser.id && message.receiverId === userId)
      ) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();

        // Marcar como lida se a mensagem for do outro usuário
        if (message.senderId === userId) {
          api.put(`/dm/${userId}/read`);
        }
      }
    };

    // Listeners de digitação
    const handleTypingStart = ({ userId: typingUserId }) => {
      if (typingUserId === userId) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = ({ userId: typingUserId }) => {
      if (typingUserId === userId) {
        setIsTyping(false);
      }
    };

    socket.on('dm:new', handleNewMessage);
    socket.on('dm:typing:start', handleTypingStart);
    socket.on('dm:typing:stop', handleTypingStop);

    return () => {
      socket.off('dm:new', handleNewMessage);
      socket.off('dm:typing:start', handleTypingStart);
      socket.off('dm:typing:stop', handleTypingStop);
    };
  }, [socket, userId, currentUser.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadMessages() {
    setLoading(true);
    try {
      const response = await api.get(`/dm/${userId}`);
      setMessages(response.data);
      onLoadConversations?.();
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleTyping() {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      socket?.emit('dm:typing:start', { receiverId: userId });
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('dm:typing:stop', { receiverId: userId });
      typingTimeoutRef.current = null;
    }, 2000);
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await api.post(`/dm/${userId}`, {
        content: newMessage.trim(),
      });
      setNewMessage('');

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        socket?.emit('dm:typing:stop', { receiverId: userId });
        typingTimeoutRef.current = null;
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function getInitials(name) {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function getStatusColor(status) {
    switch (status) {
      case 'online': return 'var(--status-online)';
      case 'away': return 'var(--status-away)';
      case 'busy': return 'var(--status-busy)';
      default: return 'var(--status-offline)';
    }
  }

  if (!otherUser) {
    return (
      <div className="chat-messages-empty">
        <p>Usuário não encontrado</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-left">
          <div className="dm-header-avatar">
            <div className="avatar avatar-md">
              {otherUser.avatar ? (
                <img src={otherUser.avatar} alt={otherUser.name} />
              ) : (
                getInitials(otherUser.name)
              )}
            </div>
            <span
              className="dm-header-status"
              style={{ background: getStatusColor(otherUser.status) }}
            />
          </div>
          <div className="chat-header-info">
            <h2>{otherUser.name}</h2>
            <p style={{ textTransform: 'capitalize' }}>{otherUser.status}</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="chat-messages">
        {loading ? (
          <div className="chat-messages-empty">
            <div className="loading-spinner"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-messages-empty">
            <div className="chat-messages-empty-icon">
              <MessageCircle size={32} />
            </div>
            <h3>Início da conversa</h3>
            <p>Envie uma mensagem para {otherUser.name}</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <Message
                key={message.id}
                message={{
                  ...message,
                  user: message.sender,
                }}
                showAvatar={
                  index === 0 ||
                  messages[index - 1]?.senderId !== message.senderId ||
                  new Date(message.createdAt) - new Date(messages[index - 1]?.createdAt) > 300000
                }
                isOwn={message.senderId === currentUser.id}
                isDM
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing Indicator */}
      {isTyping && (
        <div className="typing-indicator">
          <span>{otherUser.name}</span> está digitando...
        </div>
      )}

      {/* Input */}
      <div className="chat-input-container">
        <form onSubmit={handleSendMessage} className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder={`Mensagem para ${otherUser.name}`}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            rows={1}
          />
          <div className="chat-input-actions">
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!newMessage.trim() || sending}
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .dm-header-avatar {
          position: relative;
        }

        .dm-header-status {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--bg-secondary);
        }
      `}</style>
    </>
  );
}

