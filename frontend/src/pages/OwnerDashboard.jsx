import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { ownerAPI } from '../services/api';
import {
  Building2, Plus, MapPin, TrendingUp, Users,
  Zap, DollarSign, AlertCircle, CheckCircle
} from 'lucide-react';

const OwnerDashboard = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStation, setNewStation] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    latitude: '',
    longitude: '',
    connectorTypes: '',
    powerKw: '',
    pricingInfo: ''
  });

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      const data = await ownerAPI.getStations();
      setStations(data);
    } catch (error) {
      console.error('Failed to load stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStation = async (e) => {
    e.preventDefault();
    try {
      await ownerAPI.addStation(newStation);
      setShowAddForm(false);
      setNewStation({
        name: '',
        address: '',
        city: '',
        state: '',
        latitude: '',
        longitude: '',
        connectorTypes: '',
        powerKw: '',
        pricingInfo: ''
      });
      loadStations();
      alert('Station added successfully!');
    } catch (error) {
      console.error('Failed to add station:', error);
      alert('Failed to add station');
    }
  };

  const handleToggleStatus = async (stationId, currentStatus) => {
    try {
      await ownerAPI.updateStation(stationId, { isActive: !currentStatus });
      loadStations();
    } catch (error) {
      console.error('Failed to update station:', error);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('owner.dashboard')}</h1>
          <p className="text-gray-600 mt-1">Manage your charging stations</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus size={18} />
          {t('owner.addStation')}
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Stations</p>
              <p className="text-3xl font-bold text-primary-600 mt-1">{stations.length}</p>
            </div>
            <Building2 className="w-12 h-12 text-primary-200" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Stations</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stations.filter(s => s.is_active).length}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-200" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Health Score</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {stations.length > 0
                  ? (stations.reduce((sum, s) => sum + s.health_score, 0) / stations.length).toFixed(0)
                  : 0}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-200" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reviews</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                {stations.reduce((sum, s) => sum + s.total_reviews, 0)}
              </p>
            </div>
            <Users className="w-12 h-12 text-purple-200" />
          </div>
        </Card>
      </div>

      {/* Stations List */}
      <Card title={t('owner.myStations')}>
        <div className="space-y-4">
          {stations.map((station) => (
            <div
              key={station.id}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="text-primary-600" size={24} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{station.name}</h3>
                      {station.is_verified === 1 && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Verified
                        </span>
                      )}
                      {station.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                      <MapPin size={14} />
                      {station.address}, {station.city}
                    </p>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Zap size={16} className="text-yellow-600" />
                        <span>{station.power_kw}kW</span>
                      </div>
                      <div>Health: {station.health_score}/100</div>
                      <div>Rating: {station.avg_rating.toFixed(1)}⭐ ({station.total_reviews})</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={station.is_active ? 'danger' : 'success'}
                    size="sm"
                    onClick={() => handleToggleStatus(station.id, station.is_active)}
                  >
                    {station.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Link to={`/stations/${station.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {stations.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Building2 size={48} className="mx-auto mb-4" />
              <p>No stations yet. Add your first station!</p>
            </div>
          )}
        </div>
      </Card>

      {/* Add Station Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleAddStation} className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">{t('owner.addStation')}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Station Name"
                  value={newStation.name}
                  onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                  required
                />

                <Input
                  label="City"
                  value={newStation.city}
                  onChange={(e) => setNewStation({ ...newStation, city: e.target.value })}
                  required
                />

                <div className="md:col-span-2">
                  <Input
                    label="Address"
                    value={newStation.address}
                    onChange={(e) => setNewStation({ ...newStation, address: e.target.value })}
                    required
                  />
                </div>

                <Input
                  label="State"
                  value={newStation.state}
                  onChange={(e) => setNewStation({ ...newStation, state: e.target.value })}
                  required
                />

                <Input
                  label="Latitude"
                  type="number"
                  step="0.000001"
                  value={newStation.latitude}
                  onChange={(e) => setNewStation({ ...newStation, latitude: e.target.value })}
                  required
                />

                <Input
                  label="Longitude"
                  type="number"
                  step="0.000001"
                  value={newStation.longitude}
                  onChange={(e) => setNewStation({ ...newStation, longitude: e.target.value })}
                  required
                />

                <Input
                  label="Power (kW)"
                  type="number"
                  value={newStation.powerKw}
                  onChange={(e) => setNewStation({ ...newStation, powerKw: e.target.value })}
                  required
                />

                <Input
                  label="Connector Types"
                  placeholder="e.g., CCS2, CHAdeMO, Type2"
                  value={newStation.connectorTypes}
                  onChange={(e) => setNewStation({ ...newStation, connectorTypes: e.target.value })}
                  required
                />

                <Input
                  label="Pricing Info"
                  placeholder="e.g., ₹15/kWh"
                  value={newStation.pricingInfo}
                  onChange={(e) => setNewStation({ ...newStation, pricingInfo: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit">
                  Add Station
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;