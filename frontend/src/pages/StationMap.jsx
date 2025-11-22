import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Map from '../components/Map';
import { stationsAPI } from '../services/api';
import { Search, MapPin, Zap, Star, AlertCircle } from 'lucide-react';

const StationMap = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stations, setStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    verified: false,
    minHealthScore: 0
  });
  const [selectedStation, setSelectedStation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    console.log('🗺️ StationMap component mounted');
    loadStations();
    getUserLocation();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, stations]);

  const getUserLocation = () => {
    console.log('📍 Getting user location...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = [position.coords.latitude, position.coords.longitude];
          setUserLocation(location);
          console.log('✅ User location:', location);
        },
        (error) => {
          console.log('⚠️ Geolocation error:', error.message);
          // Default to India center
          setUserLocation([20.5937, 78.9629]);
        }
      );
    } else {
      console.log('⚠️ Geolocation not available');
      setUserLocation([20.5937, 78.9629]);
    }
  };

  const loadStations = async () => {
    console.log('📡 Loading stations...');
    try {
      const data = await stationsAPI.getAll();
      console.log('✅ Stations loaded:', data.length);
      setStations(data);
      setFilteredStations(data);
      setError('');
    } catch (error) {
      console.error('❌ Failed to load stations:', error);
      setError('Failed to load stations. Please try again.');
      setStations([]);
      setFilteredStations([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...stations];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.city.toLowerCase().includes(searchLower) ||
        s.address.toLowerCase().includes(searchLower)
      );
    }

    if (filters.verified) {
      filtered = filtered.filter(s => s.is_verified === 1);
    }

    if (filters.minHealthScore > 0) {
      filtered = filtered.filter(s => s.health_score >= filters.minHealthScore);
    }

    console.log(`🔍 Filtered stations: ${filtered.length} of ${stations.length}`);
    setFilteredStations(filtered);
  };

  const handleStationClick = (station) => {
    console.log('📍 Station clicked:', station.name);
    setSelectedStation(station);
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('stations.title')}</h1>
        <p className="text-gray-600 mt-1">
          {filteredStations.length} stations found
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button 
            onClick={loadStations}
            className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={t('stations.search')}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="verified"
              checked={filters.verified}
              onChange={(e) => setFilters({ ...filters, verified: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <label htmlFor="verified" className="text-sm font-medium">
              {t('stations.verifiedOnly')}
            </label>
          </div>

          <div>
            <label className="text-sm text-gray-600">Min Health: {filters.minHealthScore}</label>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={filters.minHealthScore}
              onChange={(e) => setFilters({ ...filters, minHealthScore: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stations List */}
        <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto">
          {filteredStations.map((station) => (
            <Card
              key={station.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedStation?.id === station.id ? 'ring-2 ring-primary-500' : ''
              }`}
              onClick={() => handleStationClick(station)}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg">{station.name}</h3>
                  {station.is_verified === 1 && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      ✓ Verified
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                  {station.address}, {station.city}
                </p>

                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-1">
                    <Zap size={16} className="text-yellow-600" />
                    <span>{station.power_kw}kW</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-yellow-600 fill-yellow-600" />
                    <span>{station.avg_rating.toFixed(1)}</span>
                  </div>

                  <div className={`font-medium ${getHealthScoreColor(station.health_score)}`}>
                    {station.health_score}
                  </div>
                </div>

                <div className="text-sm text-gray-600 truncate">
                  {station.connector_types}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/stations/${station.id}`);
                  }}
                  className="w-full mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  View Details
                </button>
              </div>
            </Card>
          ))}

          {filteredStations.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-400">
              <MapPin size={48} className="mx-auto mb-4" />
              <p className="font-medium">No stations found</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] p-0 overflow-hidden">
            {filteredStations.length > 0 ? (
              <Map
                stations={filteredStations}
                onStationClick={handleStationClick}
                center={userLocation}
                zoom={userLocation ? 10 : 5}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-400">
                  <MapPin size={64} className="mx-auto mb-4" />
                  <p className="text-lg font-medium">No stations to display</p>
                  <p className="text-sm mt-2">Add some stations or adjust filters</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StationMap;