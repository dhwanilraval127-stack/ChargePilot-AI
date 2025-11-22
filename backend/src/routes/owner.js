import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Get owned stations (REAL-TIME)
router.get('/stations', authenticateToken, requireRole('owner', 'admin'), async (req, res) => {
  try {
    await db.read();
    const stations = db.data.stations.filter(s => s.owner_id === req.user.id);
    
    console.log(`👤 Owner ${req.user.id} has ${stations.length} stations`);
    res.json(stations);
  } catch (error) {
    console.error('Get owned stations error:', error);
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

// Add new station (REAL-TIME)
router.post('/stations', authenticateToken, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const {
      name, address, city, state, latitude, longitude,
      connectorTypes, powerKw, pricingInfo
    } = req.body;

    const stationId = uuidv4();

    await db.read();
    
    const newStation = {
      id: stationId,
      name,
      address,
      city,
      state,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      connector_types: connectorTypes,
      power_kw: parseFloat(powerKw),
      pricing_info: pricingInfo,
      source: 'owner',
      is_verified: 1,
      owner_id: req.user.id,
      health_score: 75,
      avg_rating: 0,
      total_reviews: 0,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.data.stations.push(newStation);
    await db.write();

    console.log(`✅ Station added: ${name} by owner ${req.user.id}`);
    res.json({ message: 'Station added successfully', stationId });
  } catch (error) {
    console.error('Add station error:', error);
    res.status(500).json({ error: 'Failed to add station' });
  }
});

// Update station (REAL-TIME)
router.put('/stations/:id', authenticateToken, requireRole('owner', 'admin'), async (req, res) => {
  try {
    await db.read();
    
    const stationIndex = db.data.stations.findIndex(
      s => s.id === req.params.id && (s.owner_id === req.user.id || req.user.role === 'admin')
    );

    if (stationIndex === -1) {
      return res.status(404).json({ error: 'Station not found or unauthorized' });
    }

    const {
      name, address, connectorTypes, powerKw, pricingInfo, isActive
    } = req.body;

    // Update station
    db.data.stations[stationIndex] = {
      ...db.data.stations[stationIndex],
      name: name || db.data.stations[stationIndex].name,
      address: address || db.data.stations[stationIndex].address,
      connector_types: connectorTypes || db.data.stations[stationIndex].connector_types,
      power_kw: powerKw ? parseFloat(powerKw) : db.data.stations[stationIndex].power_kw,
      pricing_info: pricingInfo || db.data.stations[stationIndex].pricing_info,
      is_active: isActive !== undefined ? (isActive ? 1 : 0) : db.data.stations[stationIndex].is_active,
      updated_at: new Date().toISOString()
    };

    await db.write();

    console.log(`✅ Station updated: ${req.params.id}`);
    res.json({ message: 'Station updated successfully' });
  } catch (error) {
    console.error('Update station error:', error);
    res.status(500).json({ error: 'Failed to update station' });
  }
});

// Get station analytics (REAL-TIME)
router.get('/stations/:id/analytics', authenticateToken, requireRole('owner', 'admin'), async (req, res) => {
  try {
    await db.read();
    
    const station = db.data.stations.find(
      s => s.id === req.params.id && (s.owner_id === req.user.id || req.user.role === 'admin')
    );

    if (!station) {
      return res.status(404).json({ error: 'Station not found or unauthorized' });
    }

    const sessions = db.data.sessions.filter(s => s.station_id === req.params.id);
    const reviews = db.data.reviews.filter(r => r.station_id === req.params.id);

    const analytics = {
      total_sessions: sessions.length,
      total_kwh: sessions.reduce((sum, s) => sum + (parseFloat(s.kwh_charged) || 0), 0),
      total_revenue: sessions.reduce((sum, s) => sum + (parseFloat(s.estimated_cost) || 0), 0),
      avg_duration: sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + (parseInt(s.duration_minutes) || 0), 0) / sessions.length
        : 0,
      total_reviews: reviews.length,
      avg_rating: station.avg_rating
    };

    const recentSessions = sessions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    res.json({
      station,
      analytics,
      recentSessions
    });
  } catch (error) {
    console.error('Get station analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Claim station
router.post('/claim-station', authenticateToken, requireRole('owner'), upload.single('proof'), async (req, res) => {
  try {
    const { stationId } = req.body;
    const proofPath = req.file?.path;

    const claimId = uuidv4();

    await db.read();
    
    db.data.claims.push({
      id: claimId,
      user_id: req.user.id,
      station_id: stationId,
      business_proof: proofPath,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await db.write();

    console.log(`📝 Claim submitted: ${claimId} for station ${stationId}`);
    res.json({ message: 'Claim submitted successfully', claimId });
  } catch (error) {
    console.error('Claim station error:', error);
    res.status(500).json({ error: 'Failed to submit claim' });
  }
});

export default router;