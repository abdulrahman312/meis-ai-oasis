import React, { useState, useRef, useEffect } from 'react';
import { Send, Cpu, User } from 'lucide-react'; // Assuming lucide-react or similar icon set usage
import { ChatMessage, SensorData } from '../types';
import { sendMessageToGemini } from '../services/geminiService';

interface ChatWindowProps {
  historyData: SensorData[];
}

// Icons as simple SVG components if lucide-react isn't available in environment, 
// but standard instructions usually allow popular libs. using pure SVG to be safe.
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);
const BotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
);

const ChatWindow: React.FC<ChatWindowProps> = ({ historyData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'model',
      text: "As-salamu alaykum. I am the AI Agricultural Scientist for the Riyadh Oasis. I am monitoring your sensor data. How can I assist you with your crops today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(userMsg.text, historyData);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 border-l border-oasis-neon/20 backdrop-blur-md">
      {/* Chat Header */}
      <div className="p-4 border-b border-oasis-neon/20 bg-oasis-surface/80">
        <h3 className="text-oasis-neon font-bold flex items-center gap-2">
          <BotIcon />
          <span>AI SCIENTIST LINK</span>
        </h3>
        <p className="text-xs text-oasis-sandDark mt-1">
          Connected to Knowledge Base & Sensor Array
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-oasis-neon/10 border border-oasis-neon/30 text-oasis-sand rounded-br-none' 
                  : 'bg-oasis-surface border border-oasis-sandDark/20 text-emerald-100 rounded-bl-none shadow-md'
              }`}
            >
              {msg.text}
              <div className="text-[10px] opacity-40 mt-2 text-right">
                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-oasis-surface border border-oasis-sandDark/20 p-3 rounded-lg rounded-bl-none">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-oasis-neon rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-oasis-neon rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-oasis-neon rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-oasis-surface border-t border-oasis-neon/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about crop health..."
            className="flex-1 bg-black/50 border border-oasis-sandDark/30 rounded-md px-4 py-2 text-oasis-sand focus:outline-none focus:border-oasis-neon transition-colors placeholder-white/20"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-oasis-neon/20 hover:bg-oasis-neon/40 text-oasis-neon border border-oasis-neon/50 px-4 py-2 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;