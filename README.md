# 🌊 Yam Plata - Beach Conditions App

A beautiful, mobile-first web app that notifies you when the sea is calm and perfect for beach activities in Tel Aviv.

## ✨ Features

- **Real-time beach conditions** with beautiful visual indicators
- **Smart notifications** when conditions are perfect (Yam Plata!)
- **7-day forecast** with hourly breakdowns
- **Beach scoring system** (Yam Plata, Almost Plata, Not Nice)
- **Hazard alerts** for high winds, waves, and dangerous conditions
- **Sunset reminders** for perfect beach walks
- **Mobile-optimized** PWA that works like a native app
- **Beautiful UI** with glass morphism and smooth animations

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
cd weather-app
npm install
```

2. **Start the development server:**
```bash
npm start
```

3. **Open your browser:**
Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The app will be built in the `build/` folder, ready for deployment.

## 📱 Mobile App Features

### PWA (Progressive Web App)
- **Install on home screen** - Works like a native app
- **Offline support** - Cached data for offline viewing
- **Push notifications** - Get alerts for perfect beach conditions
- **Mobile-optimized** - Touch-friendly interface

### Installation Instructions
1. Open the app in Chrome/Safari on your phone
2. Look for "Add to Home Screen" or "Install App"
3. Follow the prompts to install
4. Enjoy your beach app!

## 🌊 Beach Condition Logic

### Yam Plata (Perfect) 🌊
- Wave height: < 0.2m
- Wind speed: < 5 km/h
- Temperature: 25-30°C
- Score: 80-100

### Almost Plata (Good) 🌅
- Wave height: 0.2-0.5m
- Wind speed: 5-10 km/h
- Temperature: 20-35°C
- Score: 60-79

### Not Nice (Avoid) 🌊
- Wave height: > 0.5m
- Wind speed: > 10 km/h
- Temperature: < 20°C or > 35°C
- Score: < 60

## 🔧 Technical Details

### Built With
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Open-Meteo API** for weather data
- **PWA** for mobile app experience

### API Integration
- **Open-Meteo Marine API** for:
  - Air temperature
  - Wind speed and direction
  - Wave height
  - Water temperature
  - 7-day hourly forecasts

### Architecture
- **Service Layer** - Weather data fetching and processing
- **Component-based UI** - Reusable, animated components
- **State Management** - React hooks for local state
- **Responsive Design** - Mobile-first approach

## 🎨 Design Philosophy

### Color Scheme
- **Sky Blue** (#667eea) - Ocean and sky
- **Purple** (#764ba2) - Sunset and luxury
- **Glass morphism** - Modern, premium feel
- **High contrast** - Accessible design

### UX Principles
- **Mobile-first** - Designed for phone use
- **Intuitive navigation** - Easy to understand
- **Beautiful animations** - Smooth, engaging experience
- **Accessibility** - Works for everyone

## 🚨 Notifications

### Smart Alert System
- **Perfect conditions** - When Yam Plata conditions are detected
- **Advance warning** - 48-hour forecast alerts
- **Hazard alerts** - Dangerous weather conditions
- **Sunset reminders** - Daily beach walk suggestions

### Notification Rules
- **One per day** - Avoid spam, only celebrate perfect conditions
- **Smart timing** - Based on actual forecast data
- **User control** - Browser permission-based

## 🔮 Future Enhancements

### Planned Features
- **Multiple locations** - Add Nuweiba, other beaches
- **Jellyfish alerts** - Marine life warnings
- **Tide information** - High/low tide times
- **Beach camera feeds** - Live beach views
- **Social features** - Share perfect conditions
- **Weather history** - Track seasonal patterns

### API Improvements
- **More marine data** - Currents, water quality
- **Extended forecasts** - 14-day predictions
- **Hourly updates** - Real-time condition changes

## 🐛 Troubleshooting

### Common Issues

**Weather data not loading:**
- Check internet connection
- Verify Open-Meteo API status
- Check browser console for errors

**Notifications not working:**
- Ensure browser permissions are granted
- Check if notifications are enabled in system settings
- Try refreshing the page

**App not installing on mobile:**
- Use Chrome or Safari
- Ensure HTTPS (required for PWA)
- Check if "Add to Home Screen" option appears

### Development Issues

**Build errors:**
```bash
npm run build
npm audit fix
```

**Dependency issues:**
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
- Follow TypeScript best practices
- Maintain mobile-first responsive design
- Add tests for new features
- Update documentation for changes

## 📞 Support

For support, questions, or feature requests:
- Open an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

---

**Made with ❤️ for beach lovers everywhere**

*Yam Plata - When the sea is calm, life is perfect* 🌊
