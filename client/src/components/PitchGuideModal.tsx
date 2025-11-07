import { useState } from 'react';
import axios from 'axios';
import './PitchGuideModal.css';

interface PitchGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const quickQuestions = [
  "Why should I choose the All-In-One loan over a traditional mortgage?",
  "How much can I realistically save with an All-In-One loan?",
  "What makes the daily interest calculation better?",
  "Who is the ideal borrower for this product?",
  "How does it work as a checking account?",
  "What are the risks or downsides I should know about?",
  "Can you explain the cash flow offset concept?",
  "How quickly can I access my equity if needed?",
];

export default function PitchGuideModal({ isOpen, onClose }: PitchGuideModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickQuestion = async (question: string) => {
    await sendMessage(question);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      await sendMessage(inputValue);
      setInputValue('');
    }
  };

  const sendMessage = async (question: string) => {
    // Add user message
    const userMessage: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await axios.post(`${API_URL}/pitch-guide`, {
        question,
        conversationHistory: messages,
      });

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.answer,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error getting pitch answer:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or contact your loan officer for assistance.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInputValue('');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="pitch-backdrop" onClick={onClose}></div>

      {/* Modal */}
      <div className="pitch-modal">
        <div className="pitch-header">
          <div>
            <h2>💬 Q&A with CMG AI Helper</h2>
            <p>Ask me anything about the All-In-One loan product</p>
          </div>
          <button className="pitch-close-btn" onClick={onClose} aria-label="Close Pitch Guide">
            ×
          </button>
        </div>

        {/* Messages Area */}
        <div className="pitch-messages">
          {messages.length === 0 && (
            <div className="pitch-welcome">
              <div className="pitch-welcome-icon">💡</div>
              <h3>Welcome to CMG AI Helper!</h3>
              <p>Ask me anything about the All-In-One loan product. I'm here to help you understand the benefits, answer questions, and provide expert guidance on this innovative mortgage solution.</p>

              <div className="quick-questions-grid">
                <h4>Quick Questions:</h4>
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    className="quick-question-btn"
                    onClick={() => handleQuickQuestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`pitch-message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-text">{msg.content}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="pitch-message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="message-loading">
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  Thinking...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="pitch-input-area">
          {messages.length > 0 && (
            <button className="btn-reset" onClick={handleReset}>
              🔄 New Conversation
            </button>
          )}
          <form onSubmit={handleSubmit} className="pitch-input-form">
            <input
              type="text"
              className="pitch-input"
              placeholder="Ask me anything about the All-In-One loan..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="btn-send"
              disabled={isLoading || !inputValue.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
