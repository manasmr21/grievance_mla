import React, { useRef, useEffect } from 'react';
import { getInitials } from '../../utils/formatters';

const GrievanceChatPanel = ({
  messages = [],
  chatData,
  chatLoading,
  chatError,
  newMessage,
  onMessageChange,
  onSend,
  currentUserId,
  messageRowClass = 'message-row',
  myMessageClass = 'my-message',
}) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend?.();
  };

  return (
    <div className="conversation-panel">
      {chatError && (
        <p style={{ textAlign: 'center', color: '#ef4444', margin: '8px 0', fontSize: '13px' }}>{chatError}</p>
      )}
      {chatLoading && (
        <p style={{ textAlign: 'center', color: '#64748b', margin: '8px 0', fontSize: '13px' }}>Connecting to chat...</p>
      )}

      <div className="messages-container">
        {messages.length === 0 && !chatLoading ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>No messages yet. Start the conversation.</p>
        ) : (
          messages.map((msg, index) => {
            const isStudentMessage = Number(msg.sender_id) === Number(chatData?.user1_id);
            const isMyMessage = Number(msg.sender_id) === Number(currentUserId);
            const senderName = msg.sender?.name || (isStudentMessage ? 'Student' : 'Staff');
            const senderRole = msg.sender?.role?.name || msg.sender_role || '';

            return (
              <div key={msg.id ?? index} className={`${messageRowClass} ${isMyMessage ? myMessageClass : ''}`}>
                <div className="message-avatar">{getInitials(senderName)}</div>
                <div className="message-content-wrap">
                  <div className="message-header">
                    <strong>{senderName}</strong>
                    {senderRole && <span className="role-tag">{senderRole}</span>}
                    <span className="message-time">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                  <div className="message-bubble">{msg.message}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => onMessageChange?.(e.target.value)}
          disabled={chatLoading}
        />
        <button type="submit" disabled={chatLoading || !newMessage?.trim()}>
          <i className="fa-solid fa-paper-plane" />
        </button>
      </form>
    </div>
  );
};

export default GrievanceChatPanel;
