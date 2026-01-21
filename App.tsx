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
        // Don't set error immediately on empty, might be just new sheet
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
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-oasis-dark/90 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-oasis-neon/30 bg-oasis-surface/90 backdrop-blur-md flex items-center px-6 justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-3 h-3 bg-oasis-neon rounded-full shadow-[0_0_10px_#00ff9d]"></div>
             <h1 className="text-2xl font-bold tracking-widest text-oasis-sand">
               RIYADH <span className="text-oasis-neon">AI-OASIS</span>
             </h1>
          </div>
          <div className="hidden md:block text-xs font-mono text-oasis-sandDark">
             AGRICULTURAL INTELLIGENCE UNIT
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <main className="flex-1 overflow-y-auto lg:overflow-hidden p-4 lg:p-8">
            <div className="h-full max-w-6xl mx-auto bg-black/20 border border-white/5 rounded-2xl backdrop-blur-sm overflow-hidden flex flex-col">
              <Dashboard 
                latestData={latestData} 
                status={status} 
                lastUpdated={lastUpdated} 
              />
              
              {/* Log Section */}
              <div className="flex-1 p-6 hidden lg:block overflow-y-auto custom-scrollbar">
                 <h3 className="text-oasis-sandDark mb-4 text-sm font-bold uppercase border-b border-white/10 pb-2">Recent Log Entries</h3>
                 <div className="space-y-2">
                    {data.slice().reverse().slice(0, 5).map((row, idx) => (
                      <div key={idx} className="flex justify-between text-sm font-mono p-2 hover:bg-white/5 rounded transition-colors text-gray-400">
                        <span className="w-20">{row.timestamp}</span>
                        <div className="flex space-x-4 items-center">
                          <span className={row.temperature > 30 ? 'text-orange-400' : 'text-emerald-400'}>
                            {row.temperature}°C
                          </span>
                          <span className="text-cyan-400">{row.humidity}%</span>
                          <span className="text-yellow-400 w-20 text-right">{row.lux} lx</span>
                          <span className={`w-16 text-center text-xs px-2 py-0.5 rounded ${row.fanStatus ? 'bg-green-900 text-green-400' : 'bg-red-900/20 text-red-500'}`}>
                            {row.fanStatus ? 'FAN ON' : 'FAN OFF'}
                          </span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </main>

          <aside className="w-full lg:w-[400px] xl:w-[450px] border-l border-oasis-neon/20 h-[50vh] lg:h-auto flex flex-col shadow-2xl z-20">
             <ChatWindow historyData={data} />
          </aside>

        </div>
      </div>
    </div>
  );
};

export default App;