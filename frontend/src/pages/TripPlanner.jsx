import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { tripsAPI, geocodeAPI, authAPI } from '../services/api';
import { MapPin, Navigation, Battery, Clock, DollarSign, AlertTriangle, CheckCircle, Locate } from 'lucide-react';

const TripPlanner = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    currentSoc: 80,
    vehicleId: 'default'
  });
  const [originCoords, setOriginCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [error, setError] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState({ origin: [], dest: [] });
  const [vehicles, setVehicles] = useState([]);

  // Load vehicles on mount
  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const data = await authAPI.getVehicles();
      setVehicles(data);
      if (data.length > 0) {
        const defaultVehicle = data.find(v => v.is_default) || data[0];
        setFormData(prev => ({ ...prev, vehicleId: defaultVehicle.id }));
      }
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    }
  };

  // Get user's current location
  const getCurrentLocation = () => {
    setLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setOriginCoords({ lat: latitude, lng: longitude });
          
          // Reverse geocode to get address
          try {
            const result = await geocodeAPI.reverse(latitude, longitude);
            setFormData(prev => ({ ...prev, origin: result.display_name }));
            console.log('📍 Current location:', result.display_name);
          } catch (err) {
            console.error('Reverse geocoding failed:', err);
            setFormData(prev => ({ ...prev, origin: `${latitude}, ${longitude}` }));
          }
          setLoadingLocation(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to get your location. Please enter manually.');
          setLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
      setLoadingLocation(false);
    }
  };

  // Search for location suggestions
  const searchLocation = async (query, type) => {
    if (query.length < 3) {
      setSearchSuggestions(prev => ({ ...prev, [type]: [] }));
      return;
    }
    
    try {
      const results = await geocodeAPI.search(query);
      setSearchSuggestions(prev => ({
        ...prev,
        [type]: results.slice(0, 5)
      }));
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const selectLocation = (location, type) => {
    const coords = { lat: parseFloat(location.lat), lng: parseFloat(location.lon) };
    
    if (type === 'origin') {
      setOriginCoords(coords);
      setFormData(prev => ({ ...prev, origin: location.display_name }));
      setSearchSuggestions(prev => ({ ...prev, origin: [] }));
    } else {
      setDestCoords(coords);
      setFormData(prev => ({ ...prev, destination: location.display_name }));
      setSearchSuggestions(prev => ({ ...prev, dest: [] }));
    }
  };

  const handleCheckFeasibility = async () => {
    if (!originCoords || !destCoords) {
      setError('Please select both origin and destination');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('🔍 Checking route feasibility...');
      const response = await tripsAPI.checkFeasibility({
        origin: originCoords,
        destination: destCoords,
        vehicleId: formData.vehicleId,
        currentSoc: formData.currentSoc
      });

      console.log('✅ Trip result:', response);
      setResult(response);
    } catch (err) {
      console.error('❌ Feasibility check failed:', err);
      setError(err.error || 'Failed to check route feasibility');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('tripPlanner.title')}</h1>
        <p className="text-gray-600 mt-1">Plan your EV journey with AI-powered insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card title="Trip Details">
          <div className="space-y-4">
            {/* Origin with Current Location Button */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tripPlanner.origin')}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    value={formData.origin}
                    onChange={(e) => {
                      setFormData({ ...formData, origin: e.target.value });
                      searchLocation(e.target.value, 'origin');
                    }}
                    placeholder="Enter starting location"
                  />
                  
                  {searchSuggestions.origin.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchSuggestions.origin.map((loc) => (
                        <button
                          key={loc.place_id}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm border-b last:border-0"
                          onClick={() => selectLocation(loc, 'origin')}
                        >
                          {loc.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={getCurrentLocation}
                  loading={loadingLocation}
                  title="Use current location"
                >
                  <Locate size={20} />
                </Button>
              </div>
            </div>

            {/* Destination */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tripPlanner.destination')}
              </label>
              <div className="relative">
                <Navigation className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={formData.destination}
                  onChange={(e) => {
                    setFormData({ ...formData, destination: e.target.value });
                    searchLocation(e.target.value, 'dest');
                  }}
                  placeholder="Enter destination"
                />
              </div>
              
              {searchSuggestions.dest.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchSuggestions.dest.map((loc) => (
                    <button
                      key={loc.place_id}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm border-b last:border-0"
                      onClick={() => selectLocation(loc, 'dest')}
                    >
                      {loc.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle Selection */}
            {vehicles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Vehicle
                </label>
                <select
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                >
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.model} ({vehicle.capacity}kWh)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Current Battery */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tripPlanner.currentBattery')}: {formData.currentSoc}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={formData.currentSoc}
                onChange={(e) => setFormData({ ...formData, currentSoc: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <Button
              onClick={handleCheckFeasibility}
              loading={loading}
              className="w-full"
              disabled={!originCoords || !destCoords}
            >
              {loading ? t('tripPlanner.calculating') : t('tripPlanner.checkFeasibility')}
            </Button>
          </div>
        </Card>

        {/* Results */}
        {result && (
          <Card 
            title={result.isReachable ? '✅ ' + t('tripPlanner.reachable') : '⚡ ' + t('tripPlanner.chargingRequired')}
            className={result.isReachable ? 'border-green-500' : 'border-orange-500'}
          >
            <div className="space-y-4">
              {/* Status Icon */}
              <div className="flex items-center justify-center">
                {result.isReachable ? (
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-12 h-12 text-orange-600" />
                  </div>
                )}
              </div>

              {/* Trip Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">{t('tripPlanner.distance')}</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.distance} {t('common.km')}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">{t('tripPlanner.predictedRange')}</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.predictedRange} {t('common.km')}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Current Battery</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.currentSoc}%
                  </div>
                </div>

                {result.isReachable && result.estimatedArrivalSoc !== null && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-700">{t('tripPlanner.arrivalBattery')}</div>
                    <div className="text-2xl font-bold text-green-900">
                      {result.estimatedArrivalSoc}%
                    </div>
                  </div>
                )}
              </div>

              {/* ML Prediction Info */}
              {result.mlPrediction && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-900">
                    🤖 Prediction by: <strong>{result.mlPrediction.method === 'trained_model' ? 'AI Model' : 'Physics Calculation'}</strong>
                    {result.mlPrediction.accuracy && (
                      <> • Accuracy: <strong>{result.mlPrediction.accuracy.toFixed(1)}%</strong></>
                    )}
                  </div>
                </div>
              )}

              {/* Charging Plan */}
              {!result.isReachable && result.chargingPlan && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-3">⚡ Recommended Charging Stop</h3>
                  
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-primary-900">
                          {result.recommendedStation.name}
                        </h4>
                        <p className="text-sm text-primary-700">
                          📍 {result.recommendedStation.city}
                        </p>
                      </div>
                      {result.recommendedStation.is_verified && (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-primary-800">
                      ⚡ {result.recommendedStation.power_kw}kW • 
                      Health: {result.recommendedStation.health_score}/100 •
                      Rating: {result.recommendedStation.avg_rating}⭐
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Battery className="text-orange-600" size={20} />
                      <div>
                        <div className="text-xs text-gray-600">Arrival SoC</div>
                        <div className="font-semibold">
                          {result.chargingPlan.arrivalSoc.toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Battery className="text-green-600" size={20} />
                      <div>
                        <div className="text-xs text-gray-600">{t('tripPlanner.chargeTo')}</div>
                        <div className="font-semibold">
                          {result.chargingPlan.targetSoc.toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Clock className="text-blue-600" size={20} />
                      <div>
                        <div className="text-xs text-gray-600">{t('tripPlanner.estimatedTime')}</div>
                        <div className="font-semibold">
                          {result.chargingPlan.estimatedChargingTime} {t('common.minutes')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <DollarSign className="text-purple-600" size={20} />
                      <div>
                        <div className="text-xs text-gray-600">{t('tripPlanner.estimatedCost')}</div>
                        <div className="font-semibold">
                          {t('common.rupees')}{result.chargingPlan.estimatedCost.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button variant="success" className="w-full">
                {t('tripPlanner.startNavigation')}
              </Button>
            </div>
          </Card>
        )}

        {!result && !loading && (
          <Card className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center text-gray-400">
              <Navigation className="w-16 h-16 mx-auto mb-4" />
              <p>Enter trip details and check feasibility</p>
              <p className="text-sm mt-2">Click the 📍 button to use your current location</p>
            </div>
          </Card>
        )}

        {loading && (
          <Card className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-gray-600">{t('tripPlanner.calculating')}</p>
              <p className="text-sm text-gray-500 mt-2">Analyzing route and nearby stations...</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TripPlanner;