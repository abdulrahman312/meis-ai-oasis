import React, { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import ChatWindow from './components/ChatWindow';
import { fetchSheetData } from './services/sheetService';
import { SensorData, ConnectionStatus } from './types';

const App: React.FC = () => {
  const [data, setData] = useState<SensorData[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.CONNECTING);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const result = await fetchSheetData();
      if (result.length > 0) {
        setData(result);
        setStatus(ConnectionStatus.CONNECTED);
        setLastUpdated(new Date());
      } else {
        console.warn("Fetched empty data set");
      }
    } catch (e) {
      console.error(e);
      setStatus(ConnectionStatus.ERROR);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(() => {
      fetchData();
    }, 5000); // 5 seconds polling

    return () => clearInterval(intervalId);
  }, []);

  const latestData = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="min-h-screen gradient-bg flex flex-col font-cairo">
      
      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm sadu-border z-50 sticky top-0">
        <div className="max-w-[1920px] mx-auto px-4 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between py-4 gap-4 lg:gap-0">
            
            {/* LEFT: New Logo (Ataa) */}
            <div className="lg:w-1/4 flex justify-center lg:justify-start">
              <img 
                 src="https://i.ibb.co/60j7zv2f/ataa-preview.png"
                 alt="Ataa Logo"
                 className="h-20 lg:h-28 w-auto object-contain drop-shadow-sm"
              />
            </div>

            {/* CENTER: School Identity (Logo Left + Text Right) */}
            <div className="flex-1 flex flex-row items-center justify-center gap-6 text-center px-2">
              <img 
                src="https://i.ibb.co/bgFrgXkW/meis.png" 
                alt="MEIS Logo" 
                className="h-20 lg:h-24 w-auto object-contain drop-shadow-sm" 
              />
              <div className="flex flex-col items-center lg:items-start">
                <h1 className="text-2xl lg:text-3xl font-black leading-tight animate-sadu-glow whitespace-nowrap">
                  مدرسة الشرق الأوسط العالمية - المروج
                </h1>
                <h2 className="text-sm lg:text-base text-sadu-oasis font-bold tracking-wide mt-1">
                  Middle East International School - AlMuruj
                </h2>
              </div>
            </div>

            {/* RIGHT: Project Identity */}
            <div className="lg:w-1/4 flex justify-center lg:justify-end">
              <div className="flex items-center gap-3 bg-white/50 px-6 py-3 rounded-full border border-sadu-sand shadow-sm transition-transform hover:scale-105">
                 <div className="w-3 h-3 bg-sadu-oasis rounded-full animate-pulse shadow-[0_0_10px_rgba(0,107,95,0.4)]"></div>
                 <div className="flex flex-col items-start">
                   <h3 className="text-lg font-black tracking-widest text-sadu-dark leading-none">
                     RIYADH <span className="text-sadu-red">AI-OASIS</span>
                   </h3>
                   <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                     Agricultural Intelligence Unit
                   </span>
                 </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 max-w-[1920px] mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: CHAT (Sticky, 3 Columns) */}
        <aside className="lg:col-span-3 hidden lg:block h-[calc(100vh-160px)] sticky top-36">
           <div className="h-full bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-sadu-sand/20 overflow-hidden border border-white flex flex-col">
             <ChatWindow historyData={data} />
           </div>
        </aside>

        {/* Mobile Chat View (Stacked) */}
        <div className="lg:hidden h-[500px]">
           <div className="h-full bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden border border-white flex flex-col">
             <ChatWindow historyData={data} />
           </div>
        </div>

        {/* RIGHT: DASHBOARD (9 Columns) - Expanded Size */}
        <main className="lg:col-span-9 flex flex-col h-full">
          <div className="flex-1 bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl shadow-sadu-sand/20 overflow-hidden border border-white/50 p-6 lg:p-10 relative flex flex-col justify-center">
            
            {/* Background Texture for visual depth */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-sadu-sand/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-sadu-oasis/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

            <Dashboard 
              latestData={latestData} 
              status={status} 
              lastUpdated={lastUpdated} 
            />
          </div>
        </main>

      </div>
    </div>
  );
};

export default App;