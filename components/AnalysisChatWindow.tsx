import React, { useState, useRef, useEffect } from 'react';
import { Send, BarChart3, Database } from 'lucide-react'; 
import { ChatMessage, SensorData } from '../types';
import { sendAnalysisMessage } from '../services/geminiService';

interface AnalysisChatWindowProps {
  fullData: SensorData[];
}

const AnalysisChatWindow: React.FC<AnalysisChatWindowProps> = ({ fullData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-analysis',
      role: 'model',
      text: "<p><strong>Data Analyst Online.</strong> I have access to the full historical records. I can create comparison tables, analyze trends, and audit system performance.</p>",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Ref for the scrollable container
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
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
      // Pass the FULL dataset to the analysis service
      const responseText = await sendAnalysisMessage(userMsg.text, fullData);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText, 
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "<p>Analysis failed. Please try again.</p>",
        timestamp: new Date()
      }]);
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
    <div className="flex flex-col h-full bg-white relative rounded-3xl overflow-hidden shadow-lg">
      
      {/* Decorative Top Border - Teal/Blue for Analysis */}
      <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-sadu-oasis to-teal-400"></div>

      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex items-center justify-between relative h-24">
        
        {/* Left: Identity */}
        <div className="flex items-center gap-4 z-10">
            <div className="bg-blue-100 p-3 rounded-2xl shadow-sm border border-blue-200">
                <BarChart3 className="text-blue-700" size={28} />
            </div>
            <div className="flex flex-col">
                <h2 className="text-2xl font-black tracking-tight leading-none animate-sadu-glow">Data Analyst AI</h2>
                <span className="text-xs font-bold text-blue-600/60 uppercase tracking-wide mt-1">Full History Access</span>
            </div>
        </div>

        {/* Center: Large Data Count */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-0 pointer-events-none opacity-20 lg:opacity-100">
             <div className="flex items-center gap-2">
                <Database size={16} className="text-blue-500" />
                <span className="text-4xl font-black text-blue-600 tracking-tighter leading-none">
                    {fullData.length}
                </span>
             </div>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em] mt-1">
                Data Points Loaded
             </span>
        </div>
        
        {/* Right Spacer (hidden on mobile, prevents overlap) */}
        <div className="w-10"></div>
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-50"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-700 text-white rounded-br-none' 
                  : 'bg-white border border-gray-200 text-slate-800 rounded-bl-none shadow-md'
              }`}
            >
              <div 
                className="chat-content"
                dangerouslySetInnerHTML={{ __html: msg.text }} 
              />
              <div className={`text-[10px] mt-2 text-right ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-3">
              <span className="text-xs font-bold text-blue-600 animate-pulse">Analyzing Dataset...</span>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
          <div className="flex gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., 'Compare temperature vs humidity trends'..."
              className="flex-1 bg-transparent px-3 py-2 text-sadu-dark focus:outline-none placeholder-gray-400"
            />
            
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </div>
      </div>
    </div>
  );
};

export default AnalysisChatWindow;