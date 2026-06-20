import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BeachCondition, BeachAlert } from '../types/weather';
import { WeatherService } from '../services/weatherService';
import { NotificationService } from '../services/notificationService';
import CurrentConditions from './CurrentConditions';
import ForecastChart from './ForecastChart';
import AlertsPanel from './AlertsPanel';
import { Waves } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [conditions, setConditions] = useState<BeachCondition[]>([]);
  const [alerts, setAlerts] = useState<BeachAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeatherData();
    const interval = setInterval(loadWeatherData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (conditions.length > 0) {
      const newAlerts = NotificationService.generateBeachAlerts(conditions);
      setAlerts(newAlerts);
      
      // Send notifications
      NotificationService.sendPerfectConditionsNotification(conditions);
      NotificationService.sendAdvanceForecastNotification(conditions);
    }
  }, [conditions]);

  const loadWeatherData = async () => {
    try {
      setLoading(true);
      const weatherData = await WeatherService.getBeachWeather();
      const beachConditions = WeatherService.analyzeBeachConditions(weatherData);
      setConditions(beachConditions);
      setError(null);
    } catch (err) {
      setError('Failed to load weather data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-purple-600 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center text-white"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4"
          >
            <Waves className="w-full h-full" />
          </motion.div>
          <h2 className="text-2xl font-bold">Loading Yam Plata...</h2>
          <p className="text-lg opacity-80">Checking beach conditions</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Oops! 🌊</h2>
          <p className="text-lg mb-6">{error}</p>
          <button
            onClick={loadWeatherData}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 backdrop-blur-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentCondition = conditions.find(c => {
    const conditionTime = new Date(c.time);
    const now = new Date();
    const diffHours = Math.abs((conditionTime.getTime() - now.getTime()) / (1000 * 60 * 60));
    return diffHours <= 1;
  });

  const perfectHours = conditions.filter(c => c.condition === 'yam-plata').length;
  const almostPerfectHours = conditions.filter(c => c.condition === 'almost-plata').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-purple-600">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center py-8 text-white"
      >
        <h1 className="text-4xl font-bold mb-2">🌊 Yam Plata</h1>
        <p className="text-xl opacity-90">Tel Aviv Beach Conditions</p>
      </motion.header>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-8">
        {/* Current Conditions */}
        {currentCondition && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <CurrentConditions condition={currentCondition} />
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-4 text-center text-white">
            <div className="text-3xl mb-2">🌊</div>
            <div className="text-2xl font-bold">{perfectHours}</div>
            <div className="text-sm opacity-80">Perfect Hours</div>
          </div>
          
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-4 text-center text-white">
            <div className="text-3xl mb-2">🌅</div>
            <div className="text-2xl font-bold">{almostPerfectHours}</div>
            <div className="text-sm opacity-80">Almost Perfect</div>
          </div>
          
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-4 text-center text-white">
            <div className="text-3xl mb-2">🌡️</div>
            <div className="text-2xl font-bold">{currentCondition?.temperature}°</div>
            <div className="text-sm opacity-80">Air Temp</div>
          </div>
          
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-4 text-center text-white">
            <div className="text-3xl mb-2">🌊</div>
            <div className="text-2xl font-bold">{currentCondition?.waveHeight}m</div>
            <div className="text-sm opacity-80">Waves</div>
          </div>
        </motion.div>

        {/* Forecast Chart */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <ForecastChart conditions={conditions} />
        </motion.div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <AlertsPanel alerts={alerts} />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 