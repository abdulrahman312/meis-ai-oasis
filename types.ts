export interface SensorData {
  timestamp: string;
  temperature: number;
  humidity: number;
  lux: number;
  fanStatus: boolean;
  rain: number;        // > 500 = Raining
  soilMoisture: number; // 0-100%
  waterLevel: number;  // 0-100%
}

export interface WeatherData {
  temp: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  feelsLike: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum ConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}