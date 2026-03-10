import { WeatherData } from '../types';

const API_KEY = 'c908f2b7825f093f20175adec1615adb';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Fallback data to ensure UI looks good during demos if API limits/key issues occur
const FALLBACK_WEATHER: WeatherData = {
  temp: 35,
  condition: "Clear",
  description: "Sunny (Fallback)",
  humidity: 15,
  windSpeed: 12,
  icon: "01d",
  feelsLike: 37
};

export const fetchRiyadhWeather = async (): Promise<WeatherData | null> => {
  try {
    // Add specific country code 'SA' for precision
    const response = await fetch(`${BASE_URL}?q=Riyadh,SA&units=metric&appid=${API_KEY}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Weather API Error (${response.status}): ${errorText}`);
      
      // If 401 (Unauthorized), it usually means the new key hasn't propagated yet (takes 10-20 mins).
      // Return fallback to keep UI functional.
      console.warn("Using Fallback Weather Data for Riyadh.");
      return FALLBACK_WEATHER;
    }
    
    const data = await response.json();
    
    return {
      temp: Math.round(data.main.temp),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      icon: data.weather[0].icon,
      feelsLike: Math.round(data.main.feels_like)
    };
  } catch (error) {
    console.error("Weather Network Error:", error);
    // Return fallback on network error too so the widget is never empty
    return FALLBACK_WEATHER;
  }
};