import React, { useState } from 'react';

const MessageBubble = ({ role = 'assistant', children }) => (
  <div className={`message-bubble ${role}`}>{children}</div>
);

export default function AIChatDemo() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (isLoading) return;
    const content = input.trim();
    if (!content) return;

    setMessages((prev) => [...prev, { role: 'user', content }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/rag/ask?query=${encodeURIComponent(content)}`
      );

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      let rawReply = '';

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        rawReply =
          data?.answer ??
          data?.message ??
          data?.result ??
          (typeof data === 'string' ? data : JSON.stringify(data));
      } else {
        rawReply = await response.text();
      }

      const reply =
        typeof rawReply === 'string'
          ? rawReply
          : rawReply != null
          ? JSON.stringify(rawReply)
          : '';

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply || '未返回内容。' },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `请求失败：${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-chat">
      <div className="ai-chat-subtitle card">
        <div className="subtitle-icon" role="img" aria-label="robot">
          🤖
        </div>
        <div className="subtitle-content">
          <h3>问产假</h3>
          <p>产假政策查询</p>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="chat-window card">
          {messages.map((m, i) => (
            <div key={i} className={`chat-row ${m.role}`}>
              <MessageBubble role={m.role}>
                <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
              </MessageBubble>
            </div>
          ))}
        </div>
      )}

      <div className="chat-input-area card">
        <div className="chat-input-row">
          <div className="chat-input-wrapper">
            <textarea
              className="chat-input"
              placeholder="你好，请说~"
              value={input}
              rows={3}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              className="btn chat-send-btn"
              onClick={handleSend}
              disabled={isLoading}
            >
              {isLoading ? '发送中…' : '发送'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
