import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react'; 
import { ChatMessage, SensorData } from '../types';
import { sendMessageToGemini } from '../services/geminiService';

interface ChatWindowProps {
  historyData: SensorData[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({ historyData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'model',
      text: "<p><strong>As-salamu alaykum.</strong> I am the AI Agricultural Scientist. I am analyzing the Riyadh Oasis sensor array. Ask me about crop health or system status.</p>",
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
    <div className="flex flex-col h-full bg-white relative">
      
      {/* Decorative Sadu Top Border */}
      <div className="h-2 w-full bg-gradient-to-r from-sadu-red via-sadu-dark to-sadu-oasis"></div>

      {/* Chat Header */}
      <div className="p-6 border-b border-gray-100 bg-white flex items-center justify-center sticky top-0 z-10">
        <h2 className="text-2xl font-black text-center animate-sadu-glow">
          Chat with AI Scientist
        </h2>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-sadu-bg/50">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-sadu-dark text-white rounded-br-none' 
                  : 'bg-white border border-gray-100 text-sadu-dark rounded-bl-none shadow-md'
              }`}
            >
              {/* RENDER CONTENT AS HTML */}
              <div 
                className="chat-content"
                dangerouslySetInnerHTML={{ __html: msg.text }} 
              />
              
              <div className={`text-[10px] mt-2 text-right ${msg.role === 'user' ? 'text-gray-400' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-bl-none shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-sadu-oasis rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-sadu-oasis rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-sadu-oasis rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 focus-within:border-sadu-oasis focus-within:ring-1 focus-within:ring-sadu-oasis/50 transition-all">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about crop health..."
            className="flex-1 bg-transparent px-3 py-2 text-sadu-dark focus:outline-none placeholder-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-sadu-dark hover:bg-black text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;