import express from 'express';
import db from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get platform statistics (REAL-TIME)
router.get('/statistics', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.read();
    
    const stats = {
      totalUsers: db.data.users.filter(u => u.role === 'user').length,
      totalOwners: db.data.users.filter(u => u.role === 'owner').length,
      totalStations: db.data.stations.length,
      verifiedStations: db.data.stations.filter(s => s.is_verified === 1).length,
      totalTrips: db.data.trips.length,
      pendingClaims: db.data.claims.filter(c => c.status === 'PENDING').length,
      openReports: db.data.reports.filter(r => r.status === 'OPEN').length
    };

    console.log('📊 Admin stats fetched:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get pending claims (REAL-TIME)
router.get('/claims/pending', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.read();
    
    const claims = db.data.claims
      .filter(c => c.status === 'PENDING')
      .map(claim => {
        const user = db.data.users.find(u => u.id === claim.user_id);
        const station = db.data.stations.find(s => s.id === claim.station_id);
        
        return {
          ...claim,
          owner_name: user?.name || 'Unknown',
          owner_email: user?.email || 'Unknown',
          station_name: station?.name || 'Unknown',
          station_address: station?.address || 'Unknown'
        };
      });

    console.log(`📋 ${claims.length} pending claims fetched`);
    res.json(claims);
  } catch (error) {
    console.error('Get pending claims error:', error);
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// Approve/reject claim (REAL-TIME)
router.put('/claims/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { status, adminComment } = req.body;

    await db.read();
    
    const claimIndex = db.data.claims.findIndex(c => c.id === req.params.id);
    
    if (claimIndex === -1) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const claim = db.data.claims[claimIndex];

    // Update claim
    db.data.claims[claimIndex] = {
      ...claim,
      status,
      admin_comment: adminComment,
      updated_at: new Date().toISOString()
    };

    // If approved, update station
    if (status === 'APPROVED') {
      const stationIndex = db.data.stations.findIndex(s => s.id === claim.station_id);
      if (stationIndex !== -1) {
        db.data.stations[stationIndex] = {
          ...db.data.stations[stationIndex],
          owner_id: claim.user_id,
          is_verified: 1,
          updated_at: new Date().toISOString()
        };
      }
    }

    await db.write();

    console.log(`✅ Claim ${status}: ${req.params.id}`);
    res.json({ message: `Claim ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Update claim error:', error);
    res.status(500).json({ error: 'Failed to update claim' });
  }
});

// Get all reports (REAL-TIME)
router.get('/reports', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.read();
    
    const reports = db.data.reports
      .filter(r => r.status === 'OPEN')
      .map(report => {
        const user = db.data.users.find(u => u.id === report.user_id);
        const station = db.data.stations.find(s => s.id === report.station_id);
        
        return {
          ...report,
          reporter_name: user?.name || 'Unknown',
          station_name: station?.name || 'Unknown'
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(`⚠️  ${reports.length} open reports fetched`);
    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Update report status (REAL-TIME)
router.put('/reports/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;

    await db.read();
    
    const reportIndex = db.data.reports.findIndex(r => r.id === req.params.id);
    
    if (reportIndex === -1) {
      return res.status(404).json({ error: 'Report not found' });
    }

    db.data.reports[reportIndex] = {
      ...db.data.reports[reportIndex],
      status,
      updated_at: new Date().toISOString()
    };

    await db.write();

    console.log(`✅ Report ${status}: ${req.params.id}`);
    res.json({ message: 'Report updated successfully' });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

export default router;