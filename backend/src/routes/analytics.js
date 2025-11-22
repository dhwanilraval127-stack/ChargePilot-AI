import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/user', authenticateToken, async (req, res) => {
  try {
    await db.read();
    
    const trips = db.data.trips.filter(t => t.user_id === req.user.id);
    const sessions = db.data.sessions.filter(s => s.user_id === req.user.id);

    const totalDistance = trips.reduce((sum, t) => sum + (parseFloat(t.distance) || 0), 0);
    const totalKwh = sessions.reduce((sum, s) => sum + (parseFloat(s.kwh_charged) || 0), 0);
    const totalCost = sessions.reduce((sum, s) => sum + (parseFloat(s.estimated_cost) || 0), 0);

    res.json({
      trips: trips.length,
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      avgDistance: trips.length > 0 ? parseFloat((totalDistance / trips.length).toFixed(2)) : 0,
      chargingSessions: sessions.length,
      totalKwhCharged: parseFloat(totalKwh.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      co2Saved: parseFloat((totalDistance * 0.12).toFixed(2))
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/infrastructure', async (req, res) => {
  try {
    await db.read();
    
    // State-wise distribution
    const stateMap = {};
    db.data.stations.forEach(s => {
      if (s.is_active === 1) {
        stateMap[s.state] = (stateMap[s.state] || 0) + 1;
      }
    });
    
    const stateDistribution = Object.entries(stateMap)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    // City-wise distribution
    const cityMap = {};
    db.data.stations.forEach(s => {
      if (s.is_active === 1) {
        cityMap[s.city] = (cityMap[s.city] || 0) + 1;
      }
    });
    
    const cityDistribution = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Connector types
    const connectorMap = {};
    db.data.stations.forEach(s => {
      if (s.is_active === 1 && s.connector_types) {
        const types = s.connector_types.split(',').map(t => t.trim());
        types.forEach(type => {
          connectorMap[type] = (connectorMap[type] || 0) + 1;
        });
      }
    });

    const connectorTypes = Object.entries(connectorMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      stateDistribution,
      cityDistribution,
      connectorTypes
    });
  } catch (error) {
    console.error('Get infrastructure analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;