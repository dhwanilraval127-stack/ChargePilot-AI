import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import { stationsAPI, reviewsAPI } from '../services/api';
import {
  MapPin, Zap, Star, ArrowLeft, DollarSign, Navigation, AlertCircle
} from 'lucide-react';

const StationDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [station, setStation] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    loadStationData();
  }, [id]);

  const loadStationData = async () => {
    try {
      const [stationData, reviewsData] = await Promise.all([
        stationsAPI.getById(id),
        reviewsAPI.getByStation(id)
      ]);
      setStation(stationData);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Failed to load station:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await reviewsAPI.add({
        stationId: id,
        ...reviewData
      });
      setShowReviewForm(false);
      setReviewData({ rating: 5, comment: '' });
      loadStationData();
      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review');
    }
  };

  const getDirections = () => {
    if (station) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Station not found</p>
        <Button onClick={() => navigate('/stations')} className="mt-4">
          Back to Stations
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/stations')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{station.name}</h1>
            {station.is_verified === 1 && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                ✓ Verified
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">{station.city}, {station.state}</p>
        </div>
      </div>

      {/* Main Info */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="text-primary-600 mt-1" size={20} />
              <div>
                <h3 className="font-semibold mb-1">Address</h3>
                <p className="text-gray-600">{station.address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Zap className="text-yellow-600 mt-1" size={20} />
              <div>
                <h3 className="font-semibold mb-1">Power Output</h3>
                <p className="text-gray-600">{station.power_kw} kW</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="text-green-600 mt-1" size={20} />
              <div>
                <h3 className="font-semibold mb-1">Pricing</h3>
                <p className="text-gray-600">{station.pricing_info || 'Contact station'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Health Score</span>
                <span className="text-2xl font-bold text-primary-600">
                  {station.health_score}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${station.health_score}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Rating</span>
                <div className="flex items-center gap-2">
                  <Star className="text-yellow-600 fill-yellow-600" size={20} />
                  <span className="text-2xl font-bold">
                    {station.avg_rating.toFixed(1)}
                  </span>
                  <span className="text-gray-500">
                    ({station.total_reviews} reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <h3 className="font-semibold mb-2">Connector Types</h3>
              <p className="text-sm text-primary-900">{station.connector_types}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button onClick={getDirections} className="flex-1">
            <Navigation size={18} />
            Get Directions
          </Button>
          <Button variant="outline" onClick={() => alert('Report feature coming soon!')}>
            <AlertCircle size={18} />
            Report Issue
          </Button>
        </div>
      </Card>

      {/* Reviews */}
      <Card title="Reviews">
        {!showReviewForm && (
          <Button onClick={() => setShowReviewForm(true)} className="mb-4">
            Add Review
          </Button>
        )}

        {showReviewForm && (
          <form onSubmit={handleSubmitReview} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3">Add Your Review</h3>
            
            <div className="mb-3">
              <label className="block text-sm font-medium mb-2">
                Your Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewData({ ...reviewData, rating: star })}
                    className="text-2xl"
                  >
                    <Star
                      className={star <= reviewData.rating ? 'text-yellow-600 fill-yellow-600' : 'text-gray-300'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <textarea
                className="w-full p-3 border rounded-lg"
                rows="3"
                placeholder="Write your review..."
                value={reviewData.comment}
                onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit">Submit</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowReviewForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border-b pb-4 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold">{review.user_name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={i < review.rating ? 'text-yellow-600 fill-yellow-600' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              {review.comment && (
                <p className="text-gray-600">{review.comment}</p>
              )}
            </div>
          ))}

          {reviews.length === 0 && (
            <p className="text-center text-gray-400 py-8">No reviews yet</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StationDetail;