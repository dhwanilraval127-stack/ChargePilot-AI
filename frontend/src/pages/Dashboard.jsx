import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import { analyticsAPI, stationsAPI } from '../services/api';
import { Battery, MapPin, TrendingUp, Zap, Route, Map as MapIcon } from 'lucide-react';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const analyticsData = await analyticsAPI.getUserAnalytics();
      setAnalytics(analyticsData);

      // Get nearby stations if geolocation available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const stations = await stationsAPI.getNearby(
                position.coords.latitude,
                position.coords.longitude,
                20
              );
              setNearbyStations(stations.slice(0, 5));
            } catch (error) {
              console.error('Failed to load nearby stations:', error);
            }
          },
          (error) => console.log('Geolocation not available')
        );
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      // Set default values if API fails
      setAnalytics({
        trips: 0,
        totalDistance: 0,
        chargingSessions: 0,
        co2Saved: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('dashboard.welcome')}, {user?.name}! 👋
        </h1>
        <p className="text-gray-600 mt-1">{t('app.tagline')}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100">{t('dashboard.totalTrips')}</p>
              <p className="text-3xl font-bold mt-1">{analytics?.trips || 0}</p>
            </div>
            <Route className="w-12 h-12 text-primary-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">{t('dashboard.chargingSessions')}</p>
              <p className="text-3xl font-bold mt-1">{analytics?.chargingSessions || 0}</p>
            </div>
            <Zap className="w-12 h-12 text-green-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Distance Traveled</p>
              <p className="text-3xl font-bold mt-1">{analytics?.totalDistance?.toFixed(0) || 0}</p>
              <p className="text-sm text-purple-100">{t('common.km')}</p>
            </div>
            <Battery className="w-12 h-12 text-purple-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">CO₂ Saved</p>
              <p className="text-3xl font-bold mt-1">{analytics?.co2Saved || 0}</p>
              <p className="text-sm text-orange-100">kg</p>
            </div>
            <TrendingUp className="w-12 h-12 text-orange-200" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card title={t('dashboard.quickActions')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/trip-planner"
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all text-center group"
          >
            <Route className="w-12 h-12 mx-auto text-primary-600 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold mt-3">{t('dashboard.planTrip')}</h3>
            <p className="text-sm text-gray-600 mt-1">Check route feasibility</p>
          </Link>

          <Link
            to="/stations"
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all text-center group"
          >
            <MapIcon className="w-12 h-12 mx-auto text-primary-600 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold mt-3">{t('dashboard.findStations')}</h3>
            <p className="text-sm text-gray-600 mt-1">Find nearby chargers</p>
          </Link>

          <Link
            to="/analytics"
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all text-center group"
          >
            <TrendingUp className="w-12 h-12 mx-auto text-primary-600 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold mt-3">{t('dashboard.viewAnalytics')}</h3>
            <p className="text-sm text-gray-600 mt-1">View your stats</p>
          </Link>
        </div>
      </Card>

      {/* Nearby Stations */}
      {nearbyStations.length > 0 && (
        <Card title={t('dashboard.nearbyStations')}>
          <div className="space-y-3">
            {nearbyStations.map((station) => (
              <Link
                key={station.id}
                to={`/stations/${station.id}`}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{station.name}</h4>
                    <p className="text-sm text-gray-600">{station.city}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {station.distance?.toFixed(1)} {t('common.km')}
                  </div>
                  {station.is_verified === 1 && (
                    <span className="text-xs text-green-600">✓ Verified</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;