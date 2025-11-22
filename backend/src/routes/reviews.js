import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Add review (REAL-TIME with auto rating update)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { stationId, rating, comment } = req.body;

    const reviewId = uuidv4();

    await db.read();
    
    // Add review
    const newReview = {
      id: reviewId,
      station_id: stationId,
      user_id: req.user.id,
      rating: parseInt(rating),
      comment: comment || '',
      created_at: new Date().toISOString()
    };

    db.data.reviews.push(newReview);

    // Update station average rating
    const stationReviews = db.data.reviews.filter(r => r.station_id === stationId);
    const avgRating = stationReviews.reduce((sum, r) => sum + r.rating, 0) / stationReviews.length;

    const stationIndex = db.data.stations.findIndex(s => s.id === stationId);
    if (stationIndex !== -1) {
      db.data.stations[stationIndex] = {
        ...db.data.stations[stationIndex],
        avg_rating: parseFloat(avgRating.toFixed(2)),
        total_reviews: stationReviews.length,
        updated_at: new Date().toISOString()
      };
    }

    await db.write();

    console.log(`⭐ Review added for station ${stationId}: ${rating} stars`);
    res.json({ message: 'Review added successfully', reviewId });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Get station reviews (REAL-TIME)
router.get('/station/:stationId', async (req, res) => {
  try {
    await db.read();
    
    const reviews = db.data.reviews
      .filter(r => r.station_id === req.params.stationId)
      .map(review => {
        const user = db.data.users.find(u => u.id === review.user_id);
        return {
          ...review,
          user_name: user?.name || 'Anonymous'
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(`📝 ${reviews.length} reviews fetched for station ${req.params.stationId}`);
    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Report station issue (REAL-TIME with health score update)
router.post('/report', authenticateToken, async (req, res) => {
  try {
    const { stationId, issueType, description } = req.body;

    const reportId = uuidv4();

    await db.read();
    
    // Add report
    db.data.reports.push({
      id: reportId,
      station_id: stationId,
      user_id: req.user.id,
      issue_type: issueType,
      description: description || '',
      status: 'OPEN',
      created_at: new Date().toISOString()
    });

    // Reduce health score
    const stationIndex = db.data.stations.findIndex(s => s.id === stationId);
    if (stationIndex !== -1) {
      const currentScore = db.data.stations[stationIndex].health_score;
      db.data.stations[stationIndex] = {
        ...db.data.stations[stationIndex],
        health_score: Math.max(0, currentScore - 5),
        updated_at: new Date().toISOString()
      };
    }

    await db.write();

    console.log(`⚠️  Report submitted for station ${stationId}: ${issueType}`);
    res.json({ message: 'Report submitted successfully', reportId });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

export default router;