import React from 'react';
import { motion } from 'framer-motion';
import { BeachAlert } from '../types/weather';
import { AlertTriangle, Info, Sunset, Waves } from 'lucide-react';

interface AlertsPanelProps {
  alerts: BeachAlert[];
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'perfect-conditions':
        return <Waves className="w-6 h-6" />;
      case 'hazard':
        return <AlertTriangle className="w-6 h-6" />;
      case 'sunset-reminder':
        return <Sunset className="w-6 h-6" />;
      default:
        return <Info className="w-6 h-6" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'danger':
        return 'from-red-500 to-pink-500';
      case 'warning':
        return 'from-yellow-500 to-orange-500';
      default:
        return 'from-blue-500 to-purple-500';
    }
  };

  const getAlertEmoji = (type: string) => {
    switch (type) {
      case 'perfect-conditions':
        return '🌊';
      case 'hazard':
        return '⚠️';
      case 'sunset-reminder':
        return '🌅';
      default:
        return 'ℹ️';
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
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white bg-opacity-20 backdrop-blur-sm rounded-3xl p-6 text-white"
    >
      <h3 className="text-2xl font-bold mb-6 text-center">Beach Alerts & Info</h3>
      
      <div className="space-y-4">
        {alerts.map((alert, index) => (
          <motion.div
            key={`${alert.type}-${index}`}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gradient-to-r ${getAlertColor(alert.severity)} rounded-2xl p-4 flex items-start space-x-4`}
          >
            <div className="text-3xl">{getAlertEmoji(alert.type)}</div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                {getAlertIcon(alert.type)}
                <span className="font-semibold text-lg">
                  {alert.type === 'perfect-conditions' && 'Perfect Conditions!'}
                  {alert.type === 'hazard' && 'Beach Hazard'}
                  {alert.type === 'sunset-reminder' && 'Sunset Reminder'}
                </span>
              </div>
              
              <p className="text-white opacity-90 mb-2">{alert.message}</p>
              
              <div className="text-sm opacity-75">
                {alert.type === 'sunset-reminder' ? 'Daily reminder' : `Alert at ${formatTime(alert.time)}`}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="mt-6 p-4 bg-white bg-opacity-10 rounded-2xl">
        <h4 className="font-semibold mb-3 text-center">Beach Safety Tips</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start space-x-2">
            <span className="text-yellow-400">🌊</span>
            <span>Check wave height before swimming</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-400">💨</span>
            <span>High winds can create dangerous conditions</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-orange-400">🌅</span>
            <span>Sunset is perfect for beach walks</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-green-400">🌡️</span>
            <span>Water temperature affects swimming comfort</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AlertsPanel; 