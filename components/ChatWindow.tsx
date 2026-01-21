import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, X } from 'lucide-react'; 
import { ChatMessage, SensorData } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { LiveSession } from '../services/liveService';

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
  
  // Voice State
  const [isLive, setIsLive] = useState(false);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [liveUserText, setLiveUserText] = useState('');
  const [liveModelText, setLiveModelText] = useState('');
  const [audioVolume, setAudioVolume] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, liveUserText, liveModelText]);

  // Clean up session on unmount
  useEffect(() => {
    return () => {
      if (liveSession) {
        liveSession.disconnect();
      }
    };
  }, [liveSession]);

  const toggleVoice = async () => {
    if (isLive) {
      // STOP
      liveSession?.disconnect();
      setLiveSession(null);
      setIsLive(false);
      setLiveUserText('');
      setLiveModelText('');
      setAudioVolume(0);
    } else {
      // START
      const session = new LiveSession(
        // Transcription Callback
        (role, text, isTurnComplete) => {
          if (role === 'user') {
            setLiveUserText(prev => isTurnComplete ? '' : prev + text);
            if (isTurnComplete && text) {
               // Commit final user msg
               const msg: ChatMessage = { id: Date.now().toString(), role: 'user', text: text, timestamp: new Date() };
               setMessages(prev => [...prev, msg]);
               setLiveUserText('');
            }
          } else {
            setLiveModelText(prev => isTurnComplete ? '' : prev + text);
            if (isTurnComplete && text) {
               // Commit final model msg
               const msg: ChatMessage = { id: Date.now().toString(), role: 'model', text: `<p>${text}</p>`, timestamp: new Date() };
               setMessages(prev => [...prev, msg]);
               setLiveModelText('');
            }
          }
        },
        // Status Callback
        (isConnected) => {
           setIsLive(isConnected);
        },
        // Volume Callback
        (vol) => {
           setAudioVolume(vol);
        }
      );

      // PREPARE CONTEXT FOR VOICE AI
      const latest = historyData.length > 0 ? historyData[historyData.length - 1] : null;
      let contextString = "No live sensor data is currently available.";
      
      if (latest) {
        contextString = `
          CURRENT SENSOR READINGS:
          - Temperature: ${latest.temperature}°C
          - Humidity: ${latest.humidity}%
          - Light Level: ${latest.lux} Lux
          - Rain Sensor: ${latest.rain} (${latest.rain > 500 ? 'RAINING' : 'Dry'})
          - Soil Moisture: ${latest.soilMoisture}%
          - Water Tank: ${latest.waterLevel}%
          - Cooling Fan: ${latest.fanStatus ? 'ON' : 'OFF'}
          
          SYSTEM STATUS:
          ${latest.temperature > 35 ? "WARNING: High Temperature detected." : "Temperature is normal."}
          ${latest.waterLevel < 10 ? "CRITICAL: Water level is CRITICALLY LOW." : ""}
        `;
      }

      await session.connect(contextString);
      setLiveSession(session);
    }
  };

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
      <div className="p-6 border-b border-gray-100 bg-white flex items-center justify-between sticky top-0 z-10">
        <h2 className="text-2xl font-black animate-sadu-glow flex-1 text-center">
          Chat with AI Scientist
        </h2>
        {/* Voice Indicator for Header */}
        {isLive && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100 animate-pulse absolute right-6">
            <div className="w-2 h-2 bg-red-600 rounded-full"></div>
            <span className="text-xs font-bold uppercase tracking-wider">Live</span>
          </div>
        )}
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
        
        {/* Live Streaming Messages Bubble */}
        {(liveUserText || liveModelText) && (
           <div className="flex flex-col gap-2 opacity-80 pb-4">
             {liveUserText && (
               <div className="flex justify-end">
                  <div className="max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm bg-sadu-dark/80 text-white rounded-br-none italic">
                    {liveUserText}...
                  </div>
               </div>
             )}
             {liveModelText && (
               <div className="flex justify-start">
                  <div className="max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm bg-white/80 border border-gray-100 text-sadu-dark rounded-bl-none italic">
                     {liveModelText}...
                  </div>
               </div>
             )}
           </div>
        )}

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
        
        {/* Live Mode Active Overlay */}
        {isLive ? (
           <div className="flex items-center justify-between bg-red-50 border border-red-200 p-3 rounded-xl transition-all duration-300">
             <div className="flex items-center gap-4">
               {/* Pulse Indicator */}
               <div className="relative flex items-center justify-center w-8 h-8">
                  <div 
                    className="absolute bg-red-500 rounded-full opacity-50 transition-all duration-75"
                    style={{ 
                        width: `${Math.max(10, audioVolume)}%`, 
                        height: `${Math.max(10, audioVolume)}%`,
                        maxWidth: '200%',
                        maxHeight: '200%'
                    }}
                  ></div>
                  <div className="w-3 h-3 bg-red-600 rounded-full relative z-10"></div>
               </div>
               
               <div className="flex flex-col">
                  <span className="text-sadu-dark font-bold text-sm">
                    {liveModelText ? "AI Speaking..." : (audioVolume > 10 ? "Listening..." : "Waiting for voice...")}
                  </span>
                  <span className="text-xs text-gray-500">Tap X to end session</span>
               </div>
             </div>
             
             <button 
               onClick={toggleVoice}
               className="p-2 bg-white text-sadu-dark rounded-full hover:bg-gray-100 shadow-sm border border-gray-200 transition-colors"
             >
               <X size={20} />
             </button>
           </div>
        ) : (
          <div className="flex gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 focus-within:border-sadu-oasis focus-within:ring-1 focus-within:ring-sadu-oasis/50 transition-all">
            <button
              onClick={toggleVoice}
              className="p-2 text-gray-500 hover:text-sadu-red hover:bg-red-50 rounded-lg transition-all"
              title="Start Voice Chat"
            >
              <Mic size={20} />
            </button>
            
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
        )}
      </div>
    </div>
  );
};

export default ChatWindow;