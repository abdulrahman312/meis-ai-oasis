import React, { useState, useEffect } from 'react';
import Gauge from './Gauge';
import { SensorData, ConnectionStatus } from '../types';
import { Fan, Power, CloudRain, Sun, Droplets } from 'lucide-react';
import { toggleFanControl } from '../services/sheetService';

interface DashboardProps {
  latestData: SensorData | null;
  status: ConnectionStatus;
  lastUpdated: Date | null;
}

const Dashboard: React.FC<DashboardProps> = ({ latestData, status, lastUpdated }) => {
  
  const temp = latestData?.temperature ?? 0;
  const hum = latestData?.humidity ?? 0;
  const lux = latestData?.lux ?? 0;
  const rain = latestData?.rain ?? 0;
  const soil = latestData?.soilMoisture ?? 0;
  const water = latestData?.waterLevel ?? 0;
  
  const isRaining = rain > 500;

  const [localFanStatus, setLocalFanStatus] = useState(false);
  const [lastInteractionTime, setLastInteractionTime] = useState(0);

  useEffect(() => {
    const timeSinceInteraction = Date.now() - lastInteractionTime;
    if (latestData && timeSinceInteraction > 5000) {
      setLocalFanStatus(latestData.fanStatus);
    }
  }, [latestData, lastInteractionTime]);

  const handleFanToggle = async () => {
    const newStatus = !localFanStatus;
    setLocalFanStatus(newStatus);
    setLastInteractionTime(Date.now()); 
    
    const success = await toggleFanControl(newStatus);
    
    if (!success) {
      setLocalFanStatus(!newStatus);
      setLastInteractionTime(0);
      alert("Failed to connect to Control Node.");
    }
  };

  // VIBRANT NEON COLORS
  const getColor = (val: number, type: 'temp' | 'hum' | 'lux' | 'soil') => {
    if (type === 'temp') return val > 35 ? '#FF0033' : '#FF6600'; 
    if (type === 'hum') return '#00C2CB'; 
    if (type === 'lux') return '#FFB300'; 
    if (type === 'soil') return val < 30 ? '#D6BCFA' : '#48BB78'; // Purple (Low) / Green (Good)
    return '#2D2424';
  };

  return (
    <div className="flex flex-col h-full justify-between gap-6">
      
      {/* Dashboard Header */}
      <div className="flex items-end justify-between border-b-2 border-sadu-sand/30 pb-4">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-sadu-dark tracking-tight">System Overview</h2>
          <div className="flex items-center gap-3 mt-3">
             <div className={`w-3 h-3 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
             <span className="text-base font-bold text-gray-500 uppercase tracking-widest">
               {status === ConnectionStatus.CONNECTED ? 'Live Monitoring Active' : 'Connecting to Node...'}
             </span>
          </div>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">Last Sync</p>
          <p className="text-3xl font-mono text-sadu-oasis font-bold">
            {lastUpdated ? lastUpdated.toLocaleTimeString() : '--:--:--'}
          </p>
        </div>
      </div>

      {/* Massive Floating Gauges Grid - 3x2 Layout */}
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center text-center">
          
          {/* Temperature */}
          <div className="flex flex-col items-center justify-center">
             <Gauge 
               value={temp} 
               min={0} 
               max={60} 
               label="Temperature" 
               unit="°C" 
               color={getColor(temp, 'temp')} 
               scale={1.3} 
             />
             {temp > 35 && (
               <span className="mt-2 text-xs font-bold text-white bg-[#FF0033] px-3 py-1 rounded-full animate-pulse shadow-lg">
                 HIGH HEAT
               </span>
             )}
          </div>

          {/* Humidity */}
          <div className="flex flex-col items-center justify-center">
             <Gauge 
               value={hum} 
               min={0} 
               max={100} 
               label="Humidity" 
               unit="%" 
               color={getColor(hum, 'hum')} 
               scale={1.3} 
             />
          </div>

          {/* Lux */}
          <div className="flex flex-col items-center justify-center">
             <Gauge 
               value={lux} 
               min={0} 
               max={70000} 
               label="Sunlight" 
               unit="lx" 
               color={getColor(lux, 'lux')} 
               scale={1.3} 
             />
          </div>

          {/* Rain Status */}
          <div className="flex flex-col items-center justify-center h-full">
            <h3 className="font-bold uppercase tracking-widest mb-4 text-sadu-dark text-sm">Precipitation</h3>
            <div className={`
                w-28 h-28 rounded-full flex items-center justify-center shadow-lg transition-all duration-500
                ${isRaining ? 'bg-blue-500 shadow-blue-500/50' : 'bg-yellow-400 shadow-yellow-400/50'}
            `}>
              {isRaining ? (
                <CloudRain size={50} color="white" className="animate-bounce" />
              ) : (
                <Sun size={50} color="white" className="animate-spin-slow" />
              )}
            </div>
            <p className="mt-4 font-black text-2xl text-sadu-dark">
              {isRaining ? 'RAINING' : 'DRY'}
            </p>
          </div>

          {/* Soil Moisture */}
          <div className="flex flex-col items-center justify-center">
             <Gauge 
               value={soil} 
               min={0} 
               max={100} 
               label="Soil Moisture" 
               unit="%" 
               color={getColor(soil, 'soil')} 
               scale={1.3} 
             />
             {soil < 30 && (
               <span className="mt-2 text-xs font-bold text-white bg-sadu-dark px-3 py-1 rounded-full animate-pulse">
                 NEEDS WATER
               </span>
             )}
          </div>

          {/* Water Tank Level (Vertical Bar) */}
          <div className="flex flex-col items-center justify-center h-full w-full max-w-[180px] mx-auto">
             <h3 className="font-bold uppercase tracking-widest mb-4 text-sadu-dark text-sm">Water Tank</h3>
             <div className="relative w-16 h-36 bg-gray-200 rounded-2xl overflow-hidden border-2 border-gray-300 shadow-inner">
                {/* Water Liquid */}
                <div 
                  className={`absolute bottom-0 w-full transition-all duration-1000 ease-in-out ${water < 20 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ height: `${water}%` }}
                >
                  <div className="absolute top-0 w-full h-2 bg-white/30 animate-pulse"></div>
                </div>
                {/* Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <Droplets size={24} className={water < 20 ? 'text-red-800' : 'text-blue-100'} />
                </div>
             </div>
             <p className={`mt-2 font-black text-2xl ${water < 20 ? 'text-red-500' : 'text-blue-600'}`}>
               {water}%
             </p>
             {water < 10 && (
               <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded mt-1">CRITICAL LOW</span>
             )}
          </div>

        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-sadu-sand shadow-lg mt-auto">
        
        <div className="flex items-center gap-6">
          <div 
            className={`p-4 rounded-full transition-all duration-500 flex items-center justify-center ${localFanStatus ? 'bg-black shadow-[0_0_20px_rgba(0,255,153,0.4)] border border-[#00FF99]' : 'bg-gray-100 text-gray-300'}`}
          >
            {/* Fan Icon with Neon Glow when active */}
            <Fan 
              className={`w-10 h-10 ${localFanStatus ? 'animate-spin' : ''}`} 
              color={localFanStatus ? '#00FF99' : 'currentColor'} // Neon Green
              style={localFanStatus ? { filter: 'drop-shadow(0 0 8px #00FF99)' } : {}}
            />
          </div>
          <div>
            <h3 className="font-bold text-xl text-sadu-dark">Climate Control Unit</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              {localFanStatus 
                ? 'Active cooling enabled.' 
                : 'System in standby.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleFanToggle}
          className={`
            relative overflow-hidden px-10 py-4 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-xl hover:shadow-2xl active:scale-95
            ${localFanStatus 
              ? 'bg-[#FF0033] text-white hover:bg-red-700' 
              : 'bg-white text-sadu-dark border-2 border-gray-200 hover:border-sadu-oasis hover:text-sadu-oasis'}
          `}
        >
          <div className="flex items-center gap-3 relative z-10">
            <Power size={22} strokeWidth={3} />
            <span>{localFanStatus ? 'STOP SYSTEM' : 'ACTIVATE'}</span>
          </div>
        </button>

      </div>
    </div>
  );
};

export default Dashboard;