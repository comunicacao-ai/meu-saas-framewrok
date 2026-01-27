import { useState } from 'react';
import { MoreHorizontal, Smile, Trash2, Edit2 } from 'lucide-react';
import './Message.css';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '🚀'];

export default function Message({
  message,
  showAvatar,
  isOwn,
  isDM,
  onReact,
  onDelete,
}) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  function getInitials(name) {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  }

  // Agrupar reações por emoji
  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { emoji: reaction.emoji, users: [] };
    }
    acc[reaction.emoji].users.push(reaction.user);
    return acc;
  }, {}) || {};

  return (
    <div
      className={`message ${showAvatar ? 'with-avatar' : ''} ${isOwn ? 'own' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      {showAvatar ? (
        <div className="message-avatar">
          <div className="avatar avatar-sm">
            {message.user?.avatar ? (
              <img src={message.user.avatar} alt={message.user.name} />
            ) : (
              getInitials(message.user?.name || 'U')
            )}
          </div>
        </div>
      ) : (
        <div className="message-time-gutter">
          <span className="message-time-hover">{formatTime(message.createdAt)}</span>
        </div>
      )}

      <div className="message-content">
        {showAvatar && (
          <div className="message-header">
            <span className="message-author">{message.user?.name}</span>
            <span className="message-time">
              {formatDate(message.createdAt)} às {formatTime(message.createdAt)}
            </span>
            {message.edited && (
              <span className="message-edited">(editado)</span>
            )}
          </div>
        )}

        <div className="message-text">{message.content}</div>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="message-reactions">
            {Object.values(groupedReactions).map(({ emoji, users }) => (
              <button
                key={emoji}
                className="message-reaction"
                onClick={() => onReact?.(message.id, emoji)}
                title={users.map(u => u.name).join(', ')}
              >
                <span>{emoji}</span>
                <span className="reaction-count">{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && !isDM && (
        <div className="message-actions">
          <div className="message-actions-bar">
            <button
              className="message-action-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Adicionar reação"
            >
              <Smile size={16} />
            </button>
            {isOwn && (
              <button
                className="message-action-btn danger"
                onClick={() => onDelete?.(message.id)}
                title="Deletar"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Quick Emoji Picker */}
          {showEmojiPicker && (
            <div className="emoji-picker-quick">
              {QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  className="emoji-btn"
                  onClick={() => {
                    onReact?.(message.id, emoji);
                    setShowEmojiPicker(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

