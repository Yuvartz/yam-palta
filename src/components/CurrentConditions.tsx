import React from 'react';
import { motion } from 'framer-motion';
import { BeachCondition } from '../types/weather';
import { Thermometer, Wind, Waves, Droplets, Clock } from 'lucide-react';

interface CurrentConditionsProps {
  condition: BeachCondition;
}

const CurrentConditions: React.FC<CurrentConditionsProps> = ({ condition }) => {
  const getConditionEmoji = (conditionType: string) => {
    switch (conditionType) {
      case 'yam-plata':
        return '🌊';
      case 'almost-plata':
        return '🌅';
      default:
        return '🌊';
    }
  };

  const getConditionText = (conditionType: string) => {
    switch (conditionType) {
      case 'yam-plata':
        return 'Yam Plata! Perfect conditions!';
      case 'almost-plata':
        return 'Almost Plata - Still good!';
      default:
        return 'Not ideal for beach';
    }
  };

  const getConditionColor = (conditionType: string) => {
    switch (conditionType) {
      case 'yam-plata':
        return 'from-green-400 to-emerald-500';
      case 'almost-plata':
        return 'from-yellow-400 to-orange-500';
      default:
        return 'from-red-400 to-pink-500';
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="mb-6"
    >
              <div className={`bg-gradient-to-r ${getConditionColor(condition.condition)} rounded-3xl p-6 text-white shadow-2xl`}>
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{getConditionEmoji(condition.condition)}</div>
          <h2 className="text-3xl font-bold mb-2">{getConditionText(condition.condition)}</h2>
          <p className="text-lg opacity-90">Current conditions at {formatTime(condition.time)}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="bg-white bg-opacity-20 rounded-2xl p-4 backdrop-blur-sm">
              <Thermometer className="w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{condition.temperature}°C</div>
              <div className="text-sm opacity-80">Air Temperature</div>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-white bg-opacity-20 rounded-2xl p-4 backdrop-blur-sm">
              <Droplets className="w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{condition.waterTemperature}°C</div>
              <div className="text-sm opacity-80">Water Temperature</div>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-white bg-opacity-20 rounded-2xl p-4 backdrop-blur-sm">
              <Wind className="w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{condition.windSpeed} km/h</div>
              <div className="text-sm opacity-80">Wind Speed</div>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-white bg-opacity-20 rounded-2xl p-4 backdrop-blur-sm">
              <Waves className="w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{condition.waveHeight}m</div>
              <div className="text-sm opacity-80">Wave Height</div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center bg-white bg-opacity-20 rounded-full px-6 py-3 backdrop-blur-sm">
            <Clock className="w-5 h-5 mr-2" />
            <span className="font-semibold">Beach Score: {condition.score}/100</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CurrentConditions; 