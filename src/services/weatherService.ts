import { WeatherData, BeachCondition } from '../types/weather';

export class WeatherService {
  private static telAvivCoords = {
    latitude: 32.0853,
    longitude: 34.7818
  };

  static async getBeachWeather(): Promise<WeatherData> {
    // Mock data for demo
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date();
        const times = [];
        const temperatures = [];
        const windSpeeds = [];
        const windDirections = [];
        
        for (let i = 0; i < 168; i++) {
          const time = new Date(now.getTime() + i * 60 * 60 * 1000);
          times.push(time.toISOString());
          temperatures.push(25 + Math.sin(i / 24) * 5 + Math.random() * 2);
          windSpeeds.push(5 + Math.random() * 15);
          windDirections.push(Math.random() * 360);
        }
        
        resolve({
          latitude: 32.0853,
          longitude: 34.7818,
          generationtime_ms: 0.1,
          utc_offset_seconds: 0,
          timezone: 'Asia/Jerusalem',
          timezone_abbreviation: 'IST',
          elevation: 10,
          hourly_units: {
            time: 'iso8601',
            temperature_2m: '°C',
            windspeed_10m: 'km/h',
            winddirection_10m: '°'
          },
          hourly: {
            time: times,
            temperature_2m: temperatures,
            windspeed_10m: windSpeeds,
            winddirection_10m: windDirections
          }
        });
      }, 1000);
    });
  }

  static analyzeBeachConditions(weatherData: WeatherData): BeachCondition[] {
    const conditions: BeachCondition[] = [];
    
    for (let i = 0; i < weatherData.hourly.time.length; i++) {
      const time = weatherData.hourly.time[i];
      const temperature = weatherData.hourly.temperature_2m[i];
      const windSpeed = weatherData.hourly.windspeed_10m?.[i] || 0;
      const windDirection = weatherData.hourly.winddirection_10m?.[i] || 0;
      const waveHeight = Math.random() * 0.8; // Mock wave data
      const waterTemperature = temperature - 2; // Mock water temp

      const score = this.calculateBeachScore(windSpeed, waveHeight, temperature);
      const condition = this.getBeachCondition(score);

      conditions.push({
        time,
        temperature: Math.round(temperature * 10) / 10,
        windSpeed: Math.round(windSpeed * 10) / 10,
        windDirection: Math.round(windDirection),
        waveHeight: Math.round(waveHeight * 100) / 100,
        waterTemperature: Math.round(waterTemperature * 10) / 10,
        condition,
        score
      });
    }

    return conditions;
  }

  private static calculateBeachScore(windSpeed: number, waveHeight: number, temperature: number): number {
    let score = 100;

    if (windSpeed > 20) score -= 40;
    else if (windSpeed > 15) score -= 25;
    else if (windSpeed > 10) score -= 15;
    else if (windSpeed > 5) score -= 5;

    if (waveHeight > 1.5) score -= 50;
    else if (waveHeight > 1.0) score -= 30;
    else if (waveHeight > 0.5) score -= 15;
    else if (waveHeight > 0.2) score -= 5;

    if (temperature >= 25 && temperature <= 30) score += 10;
    else if (temperature < 15 || temperature > 35) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  private static getBeachCondition(score: number): 'yam-plata' | 'almost-plata' | 'not-nice' {
    if (score >= 80) return 'yam-plata';
    if (score >= 60) return 'almost-plata';
    return 'not-nice';
  }

  static getSunsetTime(date: Date): string {
    const month = date.getMonth() + 1;
    let sunsetHour = 18;
    
    if (month >= 6 && month <= 8) sunsetHour = 19;
    else if (month >= 3 && month <= 5) sunsetHour = 18;
    else if (month >= 9 && month <= 11) sunsetHour = 17;
    else sunsetHour = 16;
    
    return `${sunsetHour.toString().padStart(2, '0')}:00`;
  }
}
