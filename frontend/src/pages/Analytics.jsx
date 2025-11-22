import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card';
import { analyticsAPI } from '../services/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Zap, DollarSign, MapPin, Leaf } from 'lucide-react';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Analytics = () => {
  const { t } = useTranslation();
  const [userStats, setUserStats] = useState(null);
  const [infrastructureStats, setInfrastructureStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [userData, infraData] = await Promise.all([
        analyticsAPI.getUserAnalytics(),
        analyticsAPI.getInfrastructure()
      ]);
      setUserStats(userData);
      setInfrastructureStats(infraData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Set default values
      setUserStats({
        trips: 0,
        totalDistance: 0,
        chargingSessions: 0,
        totalKwhCharged: 0,
        totalCost: 0,
        co2Saved: 0
      });
      setInfrastructureStats({
        stateDistribution: [],
        cityDistribution: [],
        connectorTypes: []
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('analytics.title')}</h1>
        <p className="text-gray-600 mt-1">Track your EV journey and impact</p>
      </div>

      {/* User Statistics */}
      <div>
        <h2 className="text-xl font-bold mb-4">Your Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Distance</p>
                <p className="text-3xl font-bold text-primary-600 mt-1">
                  {userStats?.totalDistance?.toFixed(0) || 0}
                </p>
                <p className="text-sm text-gray-500">{t('common.km')}</p>
              </div>
              <MapPin className="w-12 h-12 text-primary-200" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Energy</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {userStats?.totalKwhCharged?.toFixed(0) || 0}
                </p>
                <p className="text-sm text-gray-500">{t('common.kwh')}</p>
              </div>
              <Zap className="w-12 h-12 text-green-200" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {t('common.rupees')}{userStats?.totalCost?.toFixed(0) || 0}
                </p>
                <p className="text-sm text-gray-500">Spent on charging</p>
              </div>
              <DollarSign className="w-12 h-12 text-purple-200" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">CO₂ Saved</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {userStats?.co2Saved || 0}
                </p>
                <p className="text-sm text-gray-500">kg CO₂</p>
              </div>
              <Leaf className="w-12 h-12 text-green-200" />
            </div>
          </Card>
        </div>
      </div>

      {/* Infrastructure Analytics */}
      {infrastructureStats && (
        <div>
          <h2 className="text-xl font-bold mb-4">Infrastructure Insights</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* State-wise Distribution */}
            {infrastructureStats.stateDistribution?.length > 0 && (
              <Card title="State-wise Distribution">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={infrastructureStats.stateDistribution.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="state" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* City-wise Distribution */}
            {infrastructureStats.cityDistribution?.length > 0 && (
              <Card title="Top Cities">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={infrastructureStats.cityDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.city}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {infrastructureStats.cityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Trip History */}
      {userStats && (
        <Card title="Your Impact Summary">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <TrendingUp className="w-12 h-12 mx-auto text-blue-600 mb-3" />
              <div className="text-3xl font-bold text-blue-900">{userStats.trips}</div>
              <div className="text-sm text-blue-700 mt-1">Total Trips Planned</div>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <Zap className="w-12 h-12 mx-auto text-green-600 mb-3" />
              <div className="text-3xl font-bold text-green-900">{userStats.chargingSessions}</div>
              <div className="text-sm text-green-700 mt-1">Charging Sessions</div>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <Leaf className="w-12 h-12 mx-auto text-purple-600 mb-3" />
              <div className="text-3xl font-bold text-purple-900">
                {((userStats.totalDistance || 0) / 20).toFixed(0)}
              </div>
              <div className="text-sm text-purple-700 mt-1">Trees Worth of CO₂ Saved</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Analytics;