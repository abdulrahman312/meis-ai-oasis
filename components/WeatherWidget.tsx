import React from 'react';
import { WeatherData } from '../types';
import { Wind, Droplets, MapPin, Thermometer } from 'lucide-react';

interface WeatherWidgetProps {
  data: WeatherData | null;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-400">
        <span className="animate-pulse">Loading Weather...</span>
      </div>
    );
  }

  // Get current time for dynamic background feel (simple day/night simulation logic could go here)
  const isNight = new Date().getHours() > 18 || new Date().getHours() < 6;

  return (
    <div className="relative h-full w-full overflow-hidden bg-white text-sadu-dark flex flex-col font-cairo">
      
      {/* Decorative Background Map/Pattern */}
      <div className="absolute inset-0 opacity-5 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Riyadh_Skyline.jpg/640px-Riyadh_Skyline.jpg')] bg-cover bg-center grayscale pointer-events-none"></div>
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-6 pb-2">
        <div className="flex items-center gap-2">
           <MapPin className="text-sadu-red animate-bounce" size={20} />
           <span className="font-black text-lg tracking-widest uppercase">Riyadh</span>
        </div>
        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md uppercase">
          Live External
        </span>
      </div>

      {/* Main Temp & Icon */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center -mt-4">
         <div className="flex items-center gap-4">
             <img 
               src={`https://openweathermap.org/img/wn/${data.icon}@2x.png`} 
               alt={data.condition}
               className="w-24 h-24 drop-shadow-lg"
             />
             <div className="flex flex-col leading-none">
                <span className="text-6xl font-black text-sadu-dark tracking-tighter">
                   {data.temp}°
                </span>
                <span className="text-sm font-bold text-gray-400 mt-1 capitalize">
                   {data.description}
                </span>
             </div>
         </div>
      </div>

      {/* Details Grid */}
      <div className="relative z-10 bg-gray-50/80 backdrop-blur-sm border-t border-gray-100 p-4 grid grid-cols-3 gap-2">
         
         <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white shadow-sm border border-gray-100">
             <Wind size={16} className="text-sadu-oasis mb-1" />
             <span className="text-lg font-bold">{data.windSpeed}</span>
             <span className="text-[10px] text-gray-400 uppercase">m/s Wind</span>
         </div>

         <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white shadow-sm border border-gray-100">
             <Droplets size={16} className="text-blue-500 mb-1" />
             <span className="text-lg font-bold">{data.humidity}%</span>
             <span className="text-[10px] text-gray-400 uppercase">Humidity</span>
         </div>

         <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white shadow-sm border border-gray-100">
             <Thermometer size={16} className="text-sadu-red mb-1" />
             <span className="text-lg font-bold">{data.feelsLike}°</span>
             <span className="text-[10px] text-gray-400 uppercase">Feels Like</span>
         </div>

      </div>
    </div>
  );
};

export default WeatherWidget;