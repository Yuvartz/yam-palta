export interface WeatherData {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: {
    time: string;
    temperature_2m: string;
    windspeed_10m?: string;
    winddirection_10m?: string;
    wave_height?: string;
    water_temperature?: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    windspeed_10m?: number[];
    winddirection_10m?: number[];
    wave_height?: number[];
    water_temperature?: number[];
  };
}

export interface BeachCondition {
  time: string;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  waveHeight: number;
  waterTemperature: number;
  condition: 'yam-plata' | 'almost-plata' | 'not-nice';
  score: number;
}

export interface BeachAlert {
  type: 'perfect-conditions' | 'hazard' | 'sunset-reminder';
  message: string;
  severity: 'info' | 'warning' | 'danger';
  time: string;
} 