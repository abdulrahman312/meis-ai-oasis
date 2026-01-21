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
  
  // Local state for optimistic UI updates
  const [localFanStatus, setLocalFanStatus] = useState(false);
  // Timestamp of last user interaction to prevent "flicker" from old polled data
  const [lastInteractionTime, setLastInteractionTime] = useState(0);

  // Sync local state with real data whenever data refreshes, 
  // BUT only if we haven't interacted recently (grace period of 5 seconds)
  useEffect(() => {
    const timeSinceInteraction = Date.now() - lastInteractionTime;
    if (latestData && timeSinceInteraction > 5000) {
      setLocalFanStatus(latestData.fanStatus);
    }
  }, [latestData, lastInteractionTime]);

  const handleFanToggle = async () => {
    // 1. Optimistic Update (Switch UI immediately)
    const newStatus = !localFanStatus;
    setLocalFanStatus(newStatus);
    setLastInteractionTime(Date.now()); // Set debounce timestamp
    
    // 2. Send Command
    const success = await toggleFanControl(newStatus);
    
    // 3. Rollback if failed
    if (!success) {
      setLocalFanStatus(!newStatus);
      // Reset interaction time so next poll can sync
      setLastInteractionTime(0);
      alert("Failed to connect to Control Node. Please check connection.");
    }
  };

  const getLuxColor = (val: number) => {
    if (val < 1000) return '#9ca3af'; 
    if (val >= 10000 && val <= 25000) return '#facc15'; 
    if (val > 30000) return '#ea580c'; 
    return '#e8d5b5'; 
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Area */}
      <div className="bg-oasis-surface border-b border-oasis-neon/30 p-6 flex justify-between items-center shadow-lg">
        <div>
          <h2 className="text-3xl font-bold text-oasis-neon tracking-tighter drop-shadow-md">
            SYSTEM STATUS
          </h2>
          <div className="flex items-center mt-2 space-x-2">
            <span className="text-oasis-sandDark text-sm font-mono">LINK:</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              status === ConnectionStatus.CONNECTED ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
            }`}>
              {status}
            </span>
            <span className="text-oasis-sandDark text-xs ml-4">
              LAST SYNC: {lastUpdated ? lastUpdated.toLocaleTimeString() : '--:--:--'}
            </span>
          </div>
        </div>
        
        {latestData && (
          <div className="text-right">
             <div className="text-xs text-oasis-sandDark uppercase">Sensor Timestamp</div>
             <div className="text-lg text-oasis-sand font-mono">{latestData.timestamp}</div>
          </div>
        )}
      </div>

      {/* Main Grid: Gauges & Controls */}
      <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        
        {/* Temp Gauge */}
        <Gauge 
          value={temp} 
          min={0} 
          max={60} 
          label="Temperature" 
          unit="°C" 
          color="#ff5e00" 
        />
        
        {/* Humidity Gauge */}
        <Gauge 
          value={hum} 
          min={0} 
          max={100} 
          label="Humidity" 
          unit="%" 
          color="#00e5ff" 
        />
        
        {/* Lux Gauge (Updated) */}
        <Gauge 
          value={lux} 
          min={0} 
          max={70000} 
          label="Solar Intensity" 
          unit="lx" 
          color={getLuxColor(lux)} 
        />

        {/* Fan Control Card */}
        <div className="flex flex-col items-center justify-center p-6 bg-oasis-surface/50 border border-oasis-neon/20 rounded-xl backdrop-blur-sm shadow-[0_0_15px_rgba(0,255,157,0.1)] h-[216px] relative overflow-hidden group">
          <h3 className="text-xl font-bold text-oasis-sand tracking-widest uppercase mb-4 z-10">Cooling Fan</h3>
          
          <div className={`mb-6 p-4 rounded-full border-2 transition-all duration-500 z-10 ${
            localFanStatus 
              ? 'border-oasis-neon bg-oasis-neon/10 shadow-[0_0_30px_#00ff9d]' 
              : 'border-red-900/50 bg-red-900/10'
          }`}>
            <Fan 
              size={48} 
              className={`transition-all duration-1000 ${
                localFanStatus ? 'text-oasis-neon animate-[spin_1s_linear_infinite]' : 'text-red-900'
              }`} 
            />
          </div>

          <button 
            onClick={handleFanToggle}
            className={`flex items-center gap-2 px-6 py-2 rounded font-bold font-mono text-sm transition-all z-10 ${
              localFanStatus
                ? 'bg-oasis-neon text-oasis-dark hover:bg-white hover:scale-105'
                : 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900'
            }`}
          >
            <Power size={16} />
            {localFanStatus ? 'SYSTEM ACTIVE' : 'SYSTEM OFF'}
          </button>

          {/* Background Pulse Effect when ON */}
          {localFanStatus && (
            <div className="absolute inset-0 bg-oasis-neon/5 animate-pulse z-0"></div>
          )}
        </div>

      </div>

      <div className="p-4 text-center text-xs text-oasis-sandDark/50 font-mono">
        RIYADH AI-OASIS MONITORING NODE // V.1.2.0 // FAN CONTROL ENABLED
      </div>
    </div>
  );
};

export default Dashboard;