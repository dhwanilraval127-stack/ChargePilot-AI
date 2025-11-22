import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

const ML_MODEL_URL = process.env.ML_MODEL_URL || 'http://localhost:5001';

// Check route feasibility with ML model
router.post('/check-feasibility', authenticateToken, async (req, res) => {
  try {
    const { origin, destination, vehicleId, currentSoc } = req.body;

    console.log('🚗 Trip feasibility check:', { origin, destination, currentSoc });

    // Get route distance from OSRM (free routing)
    let distance = 0;
    try {
      const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      const routeResponse = await axios.get(osrmUrl, { timeout: 5000 });
      distance = routeResponse.data.routes[0].distance / 1000; // Convert to km
      console.log('📍 Route distance:', distance, 'km');
    } catch (routeError) {
      console.error('Route API error, using fallback calculation');
      distance = calculateDistance(
        origin.lat, origin.lng,
        destination.lat, destination.lng
      );
    }

    // Default vehicle specs
    const vehicleSpecs = {
      battery_capacity: 50, // kWh
      efficiency: 6.5 // km/kWh
    };

    // Get weather data
    let temperature = 25;
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${origin.lat}&longitude=${origin.lng}&current_weather=true`;
      const weatherResponse = await axios.get(weatherUrl, { timeout: 3000 });
      temperature = weatherResponse.data.current_weather.temperature;
      console.log('🌡️  Temperature:', temperature, '°C');
    } catch (weatherError) {
      console.log('Weather API unavailable, using default temperature');
    }

    // Call YOUR trained ML model for range prediction
    let predictedRange = 0;
    let mlMethod = 'fallback';
    let modelAccuracy = null;
    
    try {
      console.log('🤖 Calling ML model at:', ML_MODEL_URL);
      
      const mlResponse = await axios.post(`${ML_MODEL_URL}/api/predict-range`, {
        battery_percentage: currentSoc,
        battery_capacity_kwh: vehicleSpecs.battery_capacity,
        avg_speed_kmh: 60,
        temperature_celsius: temperature,
        ac_usage: temperature > 30,
        terrain: 'flat',
        driving_mode: 'normal'
      }, { timeout: 5000 });

      if (mlResponse.data.success) {
        predictedRange = mlResponse.data.predicted_range_km;
        modelAccuracy = mlResponse.data.model_accuracy;
        mlMethod = 'trained_model';
        console.log('✅ ML Model prediction:', predictedRange, 'km');
        console.log('📊 Model accuracy:', modelAccuracy, '%');
      } else {
        throw new Error('ML model returned unsuccessful response');
      }
    } catch (mlError) {
      console.error('⚠️  ML Model error:', mlError.message);
      // Fallback calculation
      const availableKwh = (currentSoc / 100) * vehicleSpecs.battery_capacity;
      predictedRange = availableKwh * vehicleSpecs.efficiency * 0.85;
      console.log('📐 Using fallback prediction:', predictedRange, 'km');
    }

    const isReachable = predictedRange >= distance;

    let recommendedStation = null;
    let chargingPlan = null;

    if (!isReachable) {
      console.log('⚡ Charging required, finding stations...');
      
      await db.read();
      const allStations = db.data.stations.filter(s => s.is_active === 1);
      
      // Find stations along route
      const routeStations = allStations.filter(station => {
        const distFromOrigin = calculateDistance(
          origin.lat, origin.lng,
          station.latitude, station.longitude
        );
        const distFromDest = calculateDistance(
          station.latitude, station.longitude,
          destination.lat, destination.lng
        );
        
        return distFromOrigin < distance && 
               distFromDest < distance &&
               (distFromOrigin + distFromDest) < (distance * 1.3);
      });

      if (routeStations.length > 0) {
        // Sort by health score and rating
        routeStations.sort((a, b) => {
          const scoreA = (a.health_score * 0.6) + (a.avg_rating * 8);
          const scoreB = (b.health_score * 0.6) + (b.avg_rating * 8);
          return scoreB - scoreA;
        });

        recommendedStation = routeStations[0];

        // Get charging recommendation from YOUR ML model
        try {
          const chargingResponse = await axios.post(`${ML_MODEL_URL}/api/recommend-charge`, {
            distance_to_destination_km: distance,
            battery_capacity_kwh: vehicleSpecs.battery_capacity,
            current_battery_pct: currentSoc,
            avg_speed_kmh: 60,
            temperature_celsius: temperature,
            ac_usage: temperature > 30,
            terrain: 'flat',
            driving_mode: 'normal'
          }, { timeout: 5000 });

          if (chargingResponse.data.success) {
            const chargingData = chargingResponse.data;
            
            chargingPlan = {
              stationId: recommendedStation.id,
              stationName: recommendedStation.name,
              arrivalSoc: Math.max(0, currentSoc - 30), // Estimated
              targetSoc: chargingData.required_battery_pct,
              estimatedChargingTime: chargingData.estimated_charging_time_minutes,
              estimatedCost: chargingData.estimated_cost_inr,
              energyNeeded: chargingData.energy_needed_kwh
            };

            console.log('💡 ML-based charging plan:', chargingPlan);
          } else {
            throw new Error('Charging recommendation failed');
          }
        } catch (chargingError) {
          console.error('⚠️  Charging recommendation error:', chargingError.message);
          
          // Fallback charging calculation
          const remainingDistance = distance - predictedRange;
          const requiredKwh = (remainingDistance / vehicleSpecs.efficiency) * 1.2;
          const targetSoc = Math.min(100, currentSoc + ((requiredKwh / vehicleSpecs.battery_capacity) * 100));
          
          chargingPlan = {
            stationId: recommendedStation.id,
            stationName: recommendedStation.name,
            arrivalSoc: Math.max(0, currentSoc - 30),
            targetSoc: targetSoc,
            estimatedChargingTime: Math.round((requiredKwh / (recommendedStation.power_kw || 50)) * 60),
            estimatedCost: Math.round(requiredKwh * 15)
          };

          console.log('📐 Fallback charging plan:', chargingPlan);
        }
      }
    }

    // Calculate arrival SoC for reachable trips
    let estimatedArrivalSoc = null;
    if (isReachable) {
      const energyConsumed = distance / vehicleSpecs.efficiency;
      const socConsumed = (energyConsumed / vehicleSpecs.battery_capacity) * 100;
      estimatedArrivalSoc = Math.max(0, currentSoc - socConsumed);
    }

    // Log trip to database
    const tripId = uuidv4();
    await db.read();
    db.data.trips.push({
      id: tripId,
      user_id: req.user.id,
      origin: JSON.stringify(origin),
      destination: JSON.stringify(destination),
      distance: distance,
      initial_soc: currentSoc,
      predicted_range: predictedRange,
      is_reachable: isReachable ? 1 : 0,
      recommended_station_id: recommendedStation?.id || null,
      ml_method: mlMethod,
      model_accuracy: modelAccuracy,
      temperature: temperature,
      created_at: new Date().toISOString()
    });
    await db.write();

    const response = {
      tripId,
      distance: Math.round(distance * 100) / 100,
      predictedRange: Math.round(predictedRange * 100) / 100,
      isReachable,
      currentSoc,
      estimatedArrivalSoc: estimatedArrivalSoc ? Math.round(estimatedArrivalSoc * 10) / 10 : null,
      recommendedStation,
      chargingPlan,
      mlPrediction: {
        method: mlMethod,
        accuracy: modelAccuracy
      },
      conditions: {
        temperature,
        weather: 'Available'
      }
    };

    console.log('✅ Trip result:', isReachable ? 'REACHABLE ✓' : 'CHARGING NEEDED ⚡');

    res.json(response);

  } catch (error) {
    console.error('❌ Trip feasibility error:', error);
    res.status(500).json({ 
      error: 'Failed to check route feasibility',
      message: error.message 
    });
  }
});

// Get user trip history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    await db.read();
    const trips = db.data.trips
      .filter(t => t.user_id === req.user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50);

    res.json(trips);
  } catch (error) {
    console.error('Get trip history error:', error);
    res.status(500).json({ error: 'Failed to fetch trip history' });
  }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

export default router;