import { BeachCondition, BeachAlert } from '../types/weather';

export class NotificationService {
  private static readonly STORAGE_KEY = 'yam-plata-notifications';
  private static readonly LAST_NOTIFICATION_KEY = 'last-notification-date';

  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  static async sendPerfectConditionsNotification(conditions: BeachCondition[]): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) return;

    const lastNotification = localStorage.getItem(this.LAST_NOTIFICATION_KEY);
    const today = new Date().toDateString();

    // Only send one notification per day
    if (lastNotification === today) return;

    const perfectHours = conditions.filter(c => c.condition === 'yam-plata');
    if (perfectHours.length === 0) return;

    const nextPerfectTime = perfectHours[0];
    const time = new Date(nextPerfectTime.time).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const notification = new Notification('🌊 Yam Plata Alert!', {
      body: `Perfect beach conditions at ${time}! Temperature: ${nextPerfectTime.temperature}°C, Waves: ${nextPerfectTime.waveHeight}m`,
      icon: '/favicon.ico',
      tag: 'yam-plata-alert',
      requireInteraction: false
    });

    localStorage.setItem(this.LAST_NOTIFICATION_KEY, today);
    
    // Auto-close after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);
  }

  static async sendAdvanceForecastNotification(conditions: BeachCondition[]): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) return;

    // Check for perfect conditions in the next 48 hours
    const now = new Date();
    const next48Hours = conditions.filter(c => {
      const conditionTime = new Date(c.time);
      const diffHours = (conditionTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 48 && c.condition === 'yam-plata';
    });

    if (next48Hours.length > 0) {
      const firstPerfect = next48Hours[0];
      const hoursUntil = Math.round((new Date(firstPerfect.time).getTime() - now.getTime()) / (1000 * 60 * 60));
      
      const notification = new Notification('🏖️ Beach Forecast Alert!', {
        body: `Perfect conditions coming in ${hoursUntil} hours! Get ready for yam plata!`,
        icon: '/favicon.ico',
        tag: 'forecast-alert',
        requireInteraction: false
      });

      setTimeout(() => {
        notification.close();
      }, 10000);
    }
  }

  static generateBeachAlerts(conditions: BeachCondition[]): BeachAlert[] {
    const alerts: BeachAlert[] = [];
    const now = new Date();

    // Check current conditions
    const currentCondition = conditions.find(c => {
      const conditionTime = new Date(c.time);
      const diffHours = Math.abs((conditionTime.getTime() - now.getTime()) / (1000 * 60 * 60));
      return diffHours <= 1;
    });

    if (currentCondition) {
      if (currentCondition.condition === 'yam-plata') {
        alerts.push({
          type: 'perfect-conditions',
          message: 'Perfect beach conditions right now! 🌊',
          severity: 'info',
          time: currentCondition.time
        });
      }

      if (currentCondition.windSpeed > 20) {
        alerts.push({
          type: 'hazard',
          message: 'High winds detected - be careful! 💨',
          severity: 'warning',
          time: currentCondition.time
        });
      }

      if (currentCondition.waveHeight > 1.5) {
        alerts.push({
          type: 'hazard',
          message: 'High waves - not recommended for swimming! 🌊',
          severity: 'danger',
          time: currentCondition.time
        });
      }
    }

    // Sunset reminder
    const sunsetTime = this.getSunsetTime(now);
    alerts.push({
      type: 'sunset-reminder',
      message: `Sunset at ${sunsetTime} - perfect time for a beach walk! 🌅`,
      severity: 'info',
      time: now.toISOString()
    });

    return alerts;
  }

  private static getSunsetTime(date: Date): string {
    const month = date.getMonth() + 1;
    let sunsetHour = 18;
    
    if (month >= 6 && month <= 8) sunsetHour = 19;
    else if (month >= 3 && month <= 5) sunsetHour = 18;
    else if (month >= 9 && month <= 11) sunsetHour = 17;
    else sunsetHour = 16;
    
    return `${sunsetHour.toString().padStart(2, '0')}:00`;
  }
} 