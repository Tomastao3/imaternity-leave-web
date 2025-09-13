import React, { useEffect, useMemo, useRef, useState } from 'react';

// 依据难产类型推导天数（示例规则）
const getMaternityDays = (difficulty) => {
  const t = (difficulty || '').trim();
  if (/难产|剖宫|剖腹/i.test(t)) return 128; // demo mapping
  if (/多胞|双胎|三胎|多胎/i.test(t)) return 113; // demo mapping
  return 98; // normal
};

const computeResult = ({ name, leaveDate, difficulty }) => {
  const city = '上海';
  const avg12 = 20000; // 产前12个月的月均工资（示例固定值）
  const companyAvg = 50000; // 单位申报的上年度月平均工资（示例固定值）
  const days = getMaternityDays(difficulty);
  const subsidyBase = avg12 * (days / 30);
  const govtAmount = subsidyBase; // 与基数计算一致（示例）
  const companyShouldPay = companyAvg * (days / 30);
  const diff = Math.max(0, companyShouldPay - govtAmount);

  return {
    员工姓名: name || '—',
    政府发放津贴金额: Number(govtAmount.toFixed(2)),
    产假天数: days,
    需补差金额: Number(diff.toFixed(2)),
  };
};

const MessageBubble = ({ role = 'assistant', children }) => (
  <div className={`message-bubble ${role}`}>{children}</div>
);

export default function AIChatDemo() {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        '您好，我是智能助手。请在对话框中输入：员工姓名、产假请假日期（如 2025-09-01 或 2025年9月1日）、难产类型（普通/难产/多胞胎）。我将根据规则生成计算结果。',
    },
  ]);

  const addUserAndRespond = (text) => {
    const { name, leaveDate, difficulty } = parseInputs(text);
    if (!name || !leaveDate) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: '请在对话中包含员工姓名与请假日期（如：2025-09-01 或 2025年9月1日）。' },
      ]);
      return;
    }
    const result = computeResult({ name, leaveDate, difficulty });
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: result },
    ]);
  };

  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const supportsSpeech = useMemo(() => {
    return (
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }, []);

  useEffect(() => {
    if (!supportsSpeech) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'zh-CN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript || '';
      // 将识别内容填入输入框，方便用户确认或直接发送
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setMessages((prev) => [...prev, { role: 'user', content: `语音输入：${transcript}` }]);
      setIsListening(false);
    };

    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {}
    };
  }, [supportsSpeech]);

  const handleStartListen = () => {
    if (!supportsSpeech) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      // ignore repeated start
    }
  };

  const handleFiles = (e) => {
    const list = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...list]);
  };

  // 从自由文本提取姓名/日期/难产类型
  const parseInputs = (text) => {
    const nameMatch = text.match(/[\u4e00-\u9fa5]{2,4}/);
    const name = nameMatch ? nameMatch[0] : '';

    const dateMatch = text.match(/(20\d{2})(?:年|[./-])?(\d{1,2})(?:月|[./-])?(\d{1,2})?/);
    let leaveDate = '';
    if (dateMatch) {
      const y = dateMatch[1];
      const m = String(dateMatch[2] || '1').padStart(2, '0');
      const d = String(dateMatch[3] || '1').padStart(2, '0');
      leaveDate = `${y}-${m}-${d}`;
    }

    let difficulty = '普通';
    if (/难产/.test(text)) difficulty = '难产';
    else if (/多胞|双胎|三胎/.test(text)) difficulty = '多胞胎';

    return { name, leaveDate, difficulty };
  };

  const handleSend = () => {
    const content = input.trim();
    if (!content) return;
    addUserAndRespond(content);
    setInput('');
  };

  return (
    <div className="ai-chat">

      {files.length > 0 && (
        <div className="content-section">
          <div className="stats-card">
            <h4>已上传文件</h4>
            <ul className="upload-list">
              {files.map((f, idx) => (
                <li key={idx} className="upload-item">
                  <span>{f.name}</span>
                  <span className="file-size">{(f.size / 1024).toFixed(1)} KB</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="chat-window card">
        {messages.map((m, i) => (
          <div key={i} className={`chat-row ${m.role}`}>
            <MessageBubble role={m.role}>
              {typeof m.content === 'object' ? (
                <div className="result">
                  <h4>计算结果</h4>
                  <div className="data-table">
                    <table>
                      <tbody>
                        <tr><th>员工姓名</th><td>{m.content.员工姓名}</td></tr>
                        <tr><th>产假天数</th><td>{m.content.产假天数}</td></tr>
                        <tr><th>政府发放津贴金额</th><td>{m.content.政府发放津贴金额}</td></tr>
                        <tr><th>需补差金额</th><td>{m.content.需补差金额}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <span>{m.content}</span>
              )}
            </MessageBubble>
          </div>
        ))}
      </div>

      <div className="suggestion-chips">
        <button className="chip" onClick={() => addUserAndRespond('张三 2025-09-01 普通')}>示例：张三 2025-09-01 普通</button>
        <button className="chip" onClick={() => addUserAndRespond('李四 2025年10月15日 难产')}>示例：李四 2025年10月15日 难产</button>
        <button className="chip" onClick={() => addUserAndRespond('王五 2025/08/20 多胞胎')}>示例：王五 2025/08/20 多胞胎</button>
        <button className="chip warning" onClick={() => { setMessages([{ role: 'assistant', content: '您好，我是智能助手。请在对话框中输入：员工姓名、产假请假日期（如 2025-09-01 或 2025年9月1日）、难产类型（普通/难产/多胞胎）。我将根据规则生成计算结果。' }]); setFiles([]); }}>清空对话</button>
      </div>

      <div className="chat-input-bar card">
        <div className="chat-input-row">
          <input
            className="chat-input"
            placeholder="请输入（示例：张三 2025-09-01 难产），或使用语音/上传文件"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          {supportsSpeech ? (
            <button className="btn-secondary" onClick={handleStartListen} disabled={isListening}>
              {isListening ? '聆听中' : '语音'}
            </button>
          ) : null}
          <label className="btn-secondary file-input-label">
            上传
            <input type="file" multiple onChange={handleFiles} style={{ display: 'none' }} />
          </label>
          <button className="btn" onClick={handleSend}>发送</button>
        </div>
      </div>
    </div>
  );
}
