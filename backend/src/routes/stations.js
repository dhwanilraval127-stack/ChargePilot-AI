import express from 'express';
import db from '../config/database.js';
import axios from 'axios';

const router = express.Router();

// Get all stations with filters (REAL-TIME)
router.get('/', async (req, res) => {
  try {
    await db.read(); // Always read fresh data
    
    const { city, verified, minHealthScore, search } = req.query;
    
    let stations = db.data.stations.filter(s => s.is_active === 1);

    // Apply filters
    if (city) {
      stations = stations.filter(s => s.city.toLowerCase() === city.toLowerCase());
    }

    if (verified === 'true') {
      stations = stations.filter(s => s.is_verified === 1);
    }

    if (minHealthScore) {
      stations = stations.filter(s => s.health_score >= parseFloat(minHealthScore));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      stations = stations.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.address.toLowerCase().includes(searchLower) ||
        s.city.toLowerCase().includes(searchLower)
      );
    }

    // Sort by health score and rating
    stations.sort((a, b) => {
      const scoreA = (a.health_score * 0.6) + (a.avg_rating * 8);
      const scoreB = (b.health_score * 0.6) + (b.avg_rating * 8);
      return scoreB - scoreA;
    });

    console.log(`📍 Fetched ${stations.length} stations (filters applied)`);
    res.json(stations);
  } catch (error) {
    console.error('Get stations error:', error);
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

// Get station by ID (REAL-TIME)
router.get('/:id', async (req, res) => {
  try {
    await db.read();
    const station = db.data.stations.find(s => s.id === req.params.id);
    
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    console.log(`📍 Fetched station: ${station.name}`);
    res.json(station);
  } catch (error) {
    console.error('Get station error:', error);
    res.status(500).json({ error: 'Failed to fetch station' });
  }
});

// Get nearby stations (REAL-TIME with distance calculation)
router.get('/nearby/:lat/:lng', async (req, res) => {
  try {
    await db.read();
    
    const { lat, lng } = req.params;
    const radius = parseFloat(req.query.radius) || 50;

    const stations = db.data.stations
      .filter(s => s.is_active === 1)
      .map(station => {
        const distance = calculateDistance(
          parseFloat(lat), parseFloat(lng),
          station.latitude, station.longitude
        );
        return { ...station, distance: parseFloat(distance.toFixed(2)) };
      })
      .filter(s => s.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    console.log(`📍 Found ${stations.length} stations within ${radius}km`);
    res.json(stations);
  } catch (error) {
    console.error('Get nearby stations error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby stations' });
  }
});

// Get stations along route (REAL-TIME)
router.post('/along-route', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    
    console.log('🗺️  Finding stations along route...');
    
    // Get route from OSRM
    let routeCoordinates = [];
    let routeDistance = 0;
    
    try {
      const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
      const routeResponse = await axios.get(osrmUrl, { timeout: 5000 });
      
      routeCoordinates = routeResponse.data.routes[0].geometry.coordinates;
      routeDistance = routeResponse.data.routes[0].distance / 1000;
      
      console.log(`📏 Route distance: ${routeDistance.toFixed(2)} km`);
    } catch (routeError) {
      console.error('OSRM error, using direct line');
      routeCoordinates = [[origin.lng, origin.lat], [destination.lng, destination.lat]];
      routeDistance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    }

    // Get all active stations
    await db.read();
    const allStations = db.data.stations.filter(s => s.is_active === 1);
    
    // Find stations near the route (within 10km buffer)
    const stationsAlongRoute = allStations.filter(station => {
      return routeCoordinates.some(coord => {
        const distance = calculateDistance(
          coord[1], coord[0],
          station.latitude, station.longitude
        );
        return distance <= 10; // 10km buffer
      });
    }).map(station => {
      // Calculate distance from origin
      const distFromOrigin = calculateDistance(
        origin.lat, origin.lng,
        station.latitude, station.longitude
      );
      return { ...station, distanceFromOrigin: parseFloat(distFromOrigin.toFixed(2)) };
    }).sort((a, b) => a.distanceFromOrigin - b.distanceFromOrigin);

    console.log(`⚡ Found ${stationsAlongRoute.length} stations along route`);

    res.json({
      route: {
        distance: routeDistance,
        coordinates: routeCoordinates
      },
      stations: stationsAlongRoute
    });
  } catch (error) {
    console.error('Get route stations error:', error);
    res.status(500).json({ error: 'Failed to fetch route stations' });
  }
});

// Helper function
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