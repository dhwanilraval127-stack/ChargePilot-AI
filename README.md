# 🚗 ChargePilot AI - EV Route & Charging Assistant

![ChargePilot AI](https://img.shields.io/badge/ChargePilot-AI%20Powered-blue)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-18-blue)
![Python](https://img.shields.io/badge/Python-3.8%2B-yellow)

An AI-powered EV route and charging assistant that uses owner-verified charging stations, intelligent battery prediction, and real-time data to eliminate range anxiety for Electric Vehicle users.

## 🌟 Features

### For EV Users
- ✅ **AI-Powered Battery Prediction** - ML model predicts accurate range based on weather, terrain, and driving conditions
- ✅ **Smart Route Feasibility Check** - Know if you can reach your destination or need to charge
- ✅ **Verified Charging Stations** - Owner-verified stations with real-time availability
- ✅ **Intelligent Charging Recommendations** - AI suggests optimal charging stops, required %, and estimated cost
- ✅ **Multi-language Support** - English, Hindi, Gujarati
- ✅ **Emergency Low-Battery Mode** - Special mode with nearest reachable stations
- ✅ **Real-time Location** - Use current GPS location for trip planning
- ✅ **Station Reviews & Ratings** - Community-driven reliability scoring

### For Station Owners
- ✅ **Station Management Dashboard** - Add, update, and manage your charging stations
- ✅ **Performance Analytics** - Monitor usage, health score, and user feedback
- ✅ **Verification System** - Get verified to increase station visibility

### For Admins
- ✅ **Platform Analytics** - Track users, stations, trips, and system health
- ✅ **Verification Management** - Approve/reject station owner claims
- ✅ **Report Handling** - Manage user-reported issues

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Leaflet.js** - Interactive maps
- **Recharts** - Data visualization
- **i18next** - Multi-language support

### Backend
- **Node.js + Express** - REST API server
- **LowDB** - Lightweight JSON database
- **JWT** - Authentication
- **Axios** - HTTP client
- **Multer** - File uploads

### ML/AI
- **Python Flask** - ML model API
- **Scikit-learn** - Machine learning
- **Pandas & NumPy** - Data processing
- **Joblib** - Model serialization

### External APIs (All Free!)
- **OSRM** - Route calculation
- **Nominatim** - Geocoding
- **Open-Meteo** - Weather data

## 📋 Prerequisites

- Node.js 18+ ([Download](https://nodejs.org))
- Python 3.8+ ([Download](https://python.org))
- npm or yarn
- Git

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/YOUR-USERNAME/chargepilot-ai.git
cd chargepilot-ai