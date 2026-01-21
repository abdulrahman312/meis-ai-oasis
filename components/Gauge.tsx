import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  color: string;
}

const Gauge: React.FC<GaugeProps> = ({ value, min, max, label, unit, color }) => {
  // Calculate percentage for the semi-circle
  const range = max - min;
  const normalizedValue = Math.min(Math.max(value, min), max); // Clamp
  const percentage = ((normalizedValue - min) / range);

  // Data for the pie chart: [Value, Remainder]
  // We want a semi-circle, so startAngle 180, endAngle 0.
  // However, to make the "needle" logic simple with just a filled bar,
  // we can treat the whole 180 degrees as 100%.
  
  const data = [
    { name: 'value', value: percentage },
    { name: 'empty', value: 1 - percentage },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-oasis-surface/50 border border-oasis-neon/20 rounded-xl backdrop-blur-sm shadow-[0_0_15px_rgba(0,255,157,0.1)] transition-all duration-500 hover:shadow-[0_0_20px_rgba(0,255,157,0.2)]">
      <h3 className="text-xl font-bold text-oasis-sand tracking-widest uppercase mb-2">{label}</h3>
      
      <div className="relative w-64 h-32"> {/* Height is half of width for semi-circle */}
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%" // Center Y at bottom
              startAngle={180}
              endAngle={0}
              innerRadius={80}
              outerRadius={100}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell key="val" fill={color} />
              <Cell key="empty" fill="#1f2e26" /> {/* Dark background track */}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Value Overlay */}
        <div className="absolute inset-0 flex items-end justify-center pb-0">
          <div className="text-center mb-2">
            <span className={`text-4xl font-mono font-bold drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]`} style={{ color: color }}>
              {value}
            </span>
            <span className="text-lg text-oasis-sandDark ml-1">{unit}</span>
          </div>
        </div>
      </div>
      
      {/* Min/Max Labels */}
      <div className="w-64 flex justify-between px-4 mt-2 text-xs text-oasis-sandDark font-mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

export default Gauge;