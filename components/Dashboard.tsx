import React, { useState, useEffect } from 'react';
import Gauge from './Gauge';
import { SensorData, ConnectionStatus } from '../types';
import { Fan, Power } from 'lucide-react';
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
  const getColor = (val: number, type: 'temp' | 'hum' | 'lux') => {
    // Colors chosen for high contrast "Neon" look against light background
    if (type === 'temp') return val > 35 ? '#FF0033' : '#FF6600'; // Neon Red (Alert) / Neon Orange (Normal)
    if (type === 'hum') return '#00C2CB'; // Neon Cyan/Teal
    if (type === 'lux') return '#FFB300'; // Neon Gold/Amber
    return '#2D2424';
  };

  return (
    <div className="flex flex-col h-full justify-between gap-10">
      
      {/* Dashboard Header */}
      <div className="flex items-end justify-between border-b-2 border-sadu-sand/30 pb-6">
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

      {/* Massive Floating Gauges Grid */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-12 items-center text-center">
          
          {/* Temperature */}
          <div className="flex flex-col items-center justify-center h-full">
             <Gauge 
               value={temp} 
               min={0} 
               max={60} 
               label="Temperature" 
               unit="°C" 
               color={getColor(temp, 'temp')} 
               scale={1.5} // Increased Size
             />
             {temp > 35 && (
               <span className="mt-4 text-sm font-bold text-white bg-[#FF0033] px-4 py-2 rounded-full animate-pulse shadow-lg">
                 HIGH HEAT WARNING
               </span>
             )}
          </div>

          {/* Humidity */}
          <div className="flex flex-col items-center justify-center h-full">
             <Gauge 
               value={hum} 
               min={0} 
               max={100} 
               label="Humidity" 
               unit="%" 
               color={getColor(hum, 'hum')} 
               scale={1.5} // Increased Size
             />
          </div>

          {/* Lux */}
          <div className="flex flex-col items-center justify-center h-full">
             <Gauge 
               value={lux} 
               min={0} 
               max={70000} 
               label="Sunlight" 
               unit="lx" 
               color={getColor(lux, 'lux')} 
               scale={1.5} // Increased Size
             />
          </div>

        </div>
      </div>

      {/* Large Control Bar */}
      <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-sadu-sand shadow-lg mt-auto">
        
        <div className="flex items-center gap-6">
          <div 
            className={`p-5 rounded-full transition-all duration-500 flex items-center justify-center ${localFanStatus ? 'bg-black shadow-[0_0_20px_rgba(0,255,153,0.4)] border border-[#00FF99]' : 'bg-gray-100 text-gray-300'}`}
          >
            {/* Fan Icon with Neon Glow when active */}
            <Fan 
              className={`w-12 h-12 ${localFanStatus ? 'animate-spin' : ''}`} 
              color={localFanStatus ? '#00FF99' : 'currentColor'} // Neon Green
              style={localFanStatus ? { filter: 'drop-shadow(0 0 8px #00FF99)' } : {}}
            />
          </div>
          <div>
            <h3 className="font-bold text-2xl text-sadu-dark">Climate Control Unit</h3>
            <p className="text-base text-gray-600 mt-1">
              {localFanStatus 
                ? 'Active cooling enabled. Regulating greenhouse temperature.' 
                : 'System in standby. Passive cooling only.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleFanToggle}
          className={`
            relative overflow-hidden px-12 py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-xl hover:shadow-2xl active:scale-95
            ${localFanStatus 
              ? 'bg-[#FF0033] text-white hover:bg-red-700' 
              : 'bg-white text-sadu-dark border-2 border-gray-200 hover:border-sadu-oasis hover:text-sadu-oasis'}
          `}
        >
          <div className="flex items-center gap-3 relative z-10">
            <Power size={24} strokeWidth={3} />
            <span>{localFanStatus ? 'STOP SYSTEM' : 'ACTIVATE'}</span>
          </div>
        </button>

      </div>
    </div>
  );
};

export default Dashboard;