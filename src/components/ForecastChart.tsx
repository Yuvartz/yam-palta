import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BeachCondition } from '../types/weather';
import { format, parseISO } from 'date-fns';

interface ForecastChartProps {
  conditions: BeachCondition[];
}

const ForecastChart: React.FC<ForecastChartProps> = ({ conditions }) => {
  const [selectedDay, setSelectedDay] = useState<number>(0);

  // Group conditions by day
  const dailyConditions = conditions.reduce((acc, condition) => {
    const date = parseISO(condition.time);
    const dayKey = format(date, 'yyyy-MM-dd');
    
    if (!acc[dayKey]) {
      acc[dayKey] = [];
    }
    acc[dayKey].push(condition);
    return acc;
  }, {} as Record<string, BeachCondition[]>);

  const days = Object.keys(dailyConditions).sort();
  const currentDayConditions = dailyConditions[days[selectedDay]] || [];

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'yam-plata':
        return 'bg-green-400';
      case 'almost-plata':
        return 'bg-yellow-400';
      default:
        return 'bg-red-400';
    }
  };

  const getConditionEmoji = (condition: string) => {
    switch (condition) {
      case 'yam-plata':
        return '🌊';
      case 'almost-plata':
        return '🌅';
      default:
        return '🌊';
    }
  };

  const formatDay = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'EEE, MMM d');
  };

  const formatHour = (timeString: string) => {
    const date = parseISO(timeString);
    return format(date, 'HH:mm');
  };

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white bg-opacity-20 backdrop-blur-sm rounded-3xl p-6 text-white"
    >
      <h3 className="text-2xl font-bold mb-6 text-center">7-Day Forecast</h3>
      
      {/* Day Selector */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2">
        {days.map((day, index) => (
          <button
            key={day}
            onClick={() => setSelectedDay(index)}
            className={`flex-shrink-0 px-4 py-2 rounded-full font-semibold transition-all duration-300 ${
              selectedDay === index
                ? 'bg-white text-purple-600'
                : 'bg-white bg-opacity-20 hover:bg-opacity-30'
            }`}
          >
            {formatDay(day)}
          </button>
        ))}
      </div>

      {/* Hourly Forecast */}
      <div className="space-y-3">
        {currentDayConditions.map((condition, index) => (
          <motion.div
            key={condition.time}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`${getConditionColor(condition.condition)} rounded-2xl p-4 flex items-center justify-between`}
          >
            <div className="flex items-center space-x-4">
              <div className="text-2xl">{getConditionEmoji(condition.condition)}</div>
              <div>
                <div className="font-semibold">{formatHour(condition.time)}</div>
                <div className="text-sm opacity-80">
                  {condition.condition === 'yam-plata' ? 'Yam Plata!' : 
                   condition.condition === 'almost-plata' ? 'Almost Plata' : 'Not ideal'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-right">
              <div>
                <div className="font-semibold">{condition.temperature}°C</div>
                <div className="text-sm opacity-80">Air</div>
              </div>
              <div>
                <div className="font-semibold">{condition.waterTemperature}°C</div>
                <div className="text-sm opacity-80">Water</div>
              </div>
              <div>
                <div className="font-semibold">{condition.waveHeight}m</div>
                <div className="text-sm opacity-80">Waves</div>
              </div>
              <div>
                <div className="font-semibold">{condition.windSpeed} km/h</div>
                <div className="text-sm opacity-80">Wind</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full px-3 py-1">
                <span className="font-bold">{condition.score}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center space-x-4 bg-white bg-opacity-20 rounded-full px-6 py-3">
          <span className="font-semibold">
            Perfect Hours: {currentDayConditions.filter(c => c.condition === 'yam-plata').length}
          </span>
          <span className="font-semibold">
            Good Hours: {currentDayConditions.filter(c => c.condition === 'almost-plata').length}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default ForecastChart; 