import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  scale?: number; // Added scale prop
}

const Gauge: React.FC<GaugeProps> = ({ value, min, max, label, unit, color, scale = 1 }) => {
  const range = max - min;
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = ((normalizedValue - min) / range);

  const data = [
    { name: 'value', value: percentage },
    { name: 'empty', value: 1 - percentage },
  ];

  // Base dimensions * scale
  const width = 224 * scale; // Base w-56 is 14rem = 224px
  const height = 112 * scale; // Base h-28 is 7rem = 112px
  
  // Font sizes scaled
  const valSize = 2.25 * scale; // rem
  const labelSize = 0.875 * scale; // rem
  const minMaxLabelSize = 0.7 * scale; // rem

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: width }}>
      {/* Label above - NOW NEON COLORED */}
      <h3 
        className="font-bold uppercase tracking-widest mb-2 transition-colors duration-300"
        style={{ 
          fontSize: `${labelSize}rem`,
          color: color,
          textShadow: `0 0 8px ${color}40` 
        }}
      >
        {label}
      </h3>
      
      <div className="relative" style={{ width: width, height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* 
              Note: Applying direct filters to Recharts Cells can be tricky across browsers.
              We use a slight stroke to enhance definition and rely on the color intensity.
            */}
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={75 * scale}
              outerRadius={95 * scale}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              cornerRadius={5 * scale}
            >
              {/* Colored Cell with Drop Shadow Filter for Glow */}
              <Cell 
                key="val" 
                fill={color} 
                style={{ filter: `drop-shadow(0 0 4px ${color})` }} 
              />
              {/* Light Gray Track for Light Mode */}
              <Cell key="empty" fill="#E5E7EB" /> 
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Value Overlay with Text Glow */}
        <div className="absolute inset-0 flex items-end justify-center pb-0">
          <div className="text-center mb-1">
            <span 
              className="font-black font-cairo tracking-tight leading-none transition-all duration-300" 
              style={{ 
                color: color, 
                fontSize: `${valSize}rem`,
                textShadow: `0 0 15px ${color}80` // Glow effect
              }}
            >
              {value}
            </span>
            <span 
              className="font-semibold text-gray-400 ml-1" 
              style={{ fontSize: `${valSize * 0.4}rem` }}
            >
              {unit}
            </span>
          </div>
        </div>
        
        {/* Min Label - Inside, positioned by % to accommodate scale */}
        <div 
            className="absolute bottom-2 font-bold text-gray-400"
            style={{ 
              fontSize: `${minMaxLabelSize}rem`,
              left: '20%' 
            }}
        >
            {min}
        </div>

        {/* Max Label - Inside, positioned by % to accommodate scale */}
        <div 
            className="absolute bottom-2 font-bold text-gray-400"
            style={{ 
              fontSize: `${minMaxLabelSize}rem`,
              right: '20%'
            }}
        >
            {max}
        </div>
      </div>
    </div>
  );
};

export default Gauge;