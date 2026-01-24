import React, { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import ChatWindow from './components/ChatWindow';
import WeatherWidget from './components/WeatherWidget';
import AnalysisChatWindow from './components/AnalysisChatWindow';
import { fetchSheetData } from './services/sheetService';
import { fetchRiyadhWeather } from './services/weatherService';
import { SensorData, ConnectionStatus, WeatherData } from './types';

const App: React.FC = () => {
  const [data, setData] = useState<SensorData[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
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

  const fetchWeather = async () => {
    const wData = await fetchRiyadhWeather();
    if (wData) setWeather(wData);
  };

  useEffect(() => {
    fetchData();
    fetchWeather(); // Fetch weather on mount

    const intervalId = setInterval(() => {
      fetchData();
    }, 5000); // 5 seconds polling

    // Poll weather every 10 mins
    const weatherInterval = setInterval(() => {
      fetchWeather();
    }, 600000); 

    return () => {
      clearInterval(intervalId);
      clearInterval(weatherInterval);
    };
  }, []);

  const latestData = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="min-h-screen gradient-bg flex flex-col font-cairo">
      
      {/* HEADER - Fixed at Top */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm sadu-border z-50 fixed top-0 left-0 w-full h-[100px]">
        <div className="max-w-[1920px] mx-auto px-4 lg:px-8 h-full">
          <div className="flex flex-col lg:flex-row items-center justify-between h-full gap-4 lg:gap-0">
            
            {/* LEFT: Logo Ataa (Enlarged with Overflow) */}
            <div className="flex-1 lg:flex-initial flex justify-center lg:justify-start">
               <div className="relative">
                  {/* Ghost Image to reserve layout space */}
                  <img 
                     src="https://i.ibb.co/60j7zv2f/ataa-preview.png"
                     className="h-25 lg:h-20 w-auto opacity-0"
                     alt="Spacer"
                  />
                  {/* Actual Enlarged Image (2x Size: h-32 to h-40) - Moved UP (-top-8) */}
                  <img 
                     src="https://i.ibb.co/60j7zv2f/ataa-preview.png"
                     alt="Ataa Logo"
                     className="absolute -top-11 left-1/2 -translate-x-1/2 lg:left-0 lg:translate-x-0 h-32 lg:h-40 w-auto object-contain drop-shadow-sm max-w-none z-50"
                  />
               </div>
            </div>

            {/* CENTER: School Identity */}
            <div className="hidden lg:flex flex-1 flex-row items-center justify-center gap-6 text-center px-2">
              <img 
                src="https://i.ibb.co/bgFrgXkW/meis.png" 
                alt="MEIS Logo" 
                className="h-24 w-auto object-contain drop-shadow-sm" 
              />
              <div className="flex flex-col items-center">
                <h1 className="text-2xl lg:text-3xl font-black leading-tight animate-sadu-glow whitespace-nowrap">
                  مدرسة الشرق الأوسط العالمية - المروج
                </h1>
                <h2 className="text-sm lg:text-lg text-sadu-oasis font-bold tracking-wide mt-1">
                  Middle East International School - AlMuruj
                </h2>
              </div>
            </div>

            {/* RIGHT: Project Identity */}
            <div className="hidden lg:flex flex-1 lg:flex-initial justify-end">
              <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-full border border-sadu-sand shadow-sm">
                 <div className="w-2.5 h-2.5 bg-sadu-oasis rounded-full animate-pulse shadow-[0_0_10px_rgba(0,107,95,0.4)]"></div>
                 <div className="flex flex-col items-start">
                   <h3 className="text-base font-black tracking-widest text-sadu-dark leading-none">
                     RIYADH <span className="text-sadu-red">AI-OASIS</span>
                   </h3>
                 </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container - Padded for Header and Footer */}
      <div className="pt-[110px] pb-[70px] flex-1 max-w-[1920px] mx-auto w-full px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: FIXED SIDEBAR (Split: Chat + Weather) */}
        <div className="hidden lg:block lg:col-span-3">
           <aside className="sticky top-[116px] h-[calc(100vh-200px)] flex flex-col gap-6">
             
             {/* Top Half: Chat Window (Takes ~60%) */}
             <div className="flex-[0.6] bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden glow-border flex flex-col min-h-0">
               <ChatWindow historyData={data} weatherData={weather} />
             </div>

             {/* Bottom Half: Weather Widget (Takes ~40%) */}
             <div className="flex-[0.4] bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden glow-border">
                <WeatherWidget data={weather} />
             </div>

           </aside>
        </div>

        {/* Mobile View (Stacked) */}
        <div className="lg:hidden flex flex-col gap-6">
           <div className="h-[500px] bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden glow-border flex flex-col">
             <ChatWindow historyData={data} weatherData={weather} />
           </div>
           <div className="h-[250px] bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden glow-border">
              <WeatherWidget data={weather} />
           </div>
        </div>

        {/* RIGHT: Scrollable Content (Dashboard + Analysis AI) */}
        <main className="lg:col-span-9 flex flex-col gap-8">
          
          {/* Section 1: System Overview (Dashboard) */}
          <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden glow-border p-6 lg:p-10 relative flex flex-col justify-center min-h-[600px]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-sadu-sand/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-sadu-oasis/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
            
            <Dashboard 
              latestData={latestData} 
              status={status} 
              lastUpdated={lastUpdated} 
            />
          </div>

          {/* Section 2: Data Analysis AI */}
          <div className="h-[600px] glow-border rounded-3xl overflow-hidden">
             <AnalysisChatWindow fullData={data} />
          </div>

        </main>

      </div>

      {/* FOOTER - Fixed at Bottom */}
      <footer className="fixed bottom-0 left-0 w-full h-[60px] bg-white/95 backdrop-blur-md border-t-2 border-sadu-sand z-50 flex items-center justify-between px-4 lg:px-12 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        
        <div className="flex items-center gap-4">
             {/* School Logo */}
             <img src="https://i.ibb.co/bgFrgXkW/meis.png" alt="MEIS" className="h-10 w-auto" />
             <div className="h-8 w-[1px] bg-gray-300 hidden sm:block"></div>
             {/* School Name English Only */}
             <span className="text-sadu-dark font-bold text-sm hidden sm:block">
               Middle East International School - AlMuruj
             </span>
        </div>

        <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 font-semibold tracking-wide">
                &copy; 2026 All rights reserved
            </span>
            <div className="h-8 w-[1px] bg-gray-300"></div>
            
            {/* Ataa Logo (Enlarged with Overflow) */}
            <div className="relative">
                {/* Ghost Image for spacing */}
                <img src="https://i.ibb.co/60j7zv2f/ataa-preview.png" className="h-8 w-auto opacity-0" alt="Spacer" />
                {/* Real Image: Moved DOWN (-bottom-6) and RIGHT (-right-16) to avoid text overlap */}
                <img 
                   src="https://i.ibb.co/60j7zv2f/ataa-preview.png" 
                   alt="Ataa" 
                   className="absolute -bottom-6 -right-16 h-20 w-auto max-w-none" 
                />
            </div>
        </div>

      </footer>
    </div>
  );
};

export default App;