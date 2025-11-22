import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🌐 API URL:', API_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('📤 API Request:', config.method.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Handle responses
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response.data;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'An error occurred';
    
    return Promise.reject({ error: errorMessage });
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => {
    console.log('🔐 Calling login API');
    return api.post('/auth/login', { email, password });
  },
  register: (userData) => {
    console.log('📝 Calling register API with:', { ...userData, password: '***' });
    return api.post('/auth/register', userData);
  },
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  requestOwner: () => api.post('/auth/request-owner'),
  
  // Vehicle management
  getVehicles: () => api.get('/auth/vehicles'),
  addVehicle: (data) => api.post('/auth/vehicles', data),
  deleteVehicle: (id) => api.delete(`/auth/vehicles/${id}`),
  setDefaultVehicle: (id) => api.put(`/auth/vehicles/${id}/default`)
};

// Stations API
export const stationsAPI = {
  getAll: (params) => api.get('/stations', { params }),
  getById: (id) => api.get(`/stations/${id}`),
  getNearby: (lat, lng, radius) => api.get(`/stations/nearby/${lat}/${lng}`, { params: { radius } }),
  getAlongRoute: (origin, destination) => api.post('/stations/along-route', { origin, destination })
};

// Trips API
export const tripsAPI = {
  checkFeasibility: (data) => api.post('/trips/check-feasibility', data),
  getHistory: () => api.get('/trips/history')
};

// Reviews API
export const reviewsAPI = {
  add: (data) => api.post('/reviews', data),
  getByStation: (stationId) => api.get(`/reviews/station/${stationId}`),
  report: (data) => api.post('/reviews/report', data)
};

// Owner API
export const ownerAPI = {
  claimStation: (formData) => api.post('/owner/claim-station', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getStations: () => api.get('/owner/stations'),
  addStation: (data) => api.post('/owner/stations', data),
  updateStation: (id, data) => api.put(`/owner/stations/${id}`, data),
  getStationAnalytics: (id) => api.get(`/owner/stations/${id}/analytics`)
};

// Admin API
export const adminAPI = {
  getPendingClaims: () => api.get('/admin/claims/pending'),
  updateClaim: (id, data) => api.put(`/admin/claims/${id}`, data),
  getReports: () => api.get('/admin/reports'),
  updateReport: (id, status) => api.put(`/admin/reports/${id}`, { status }),
  getStatistics: () => api.get('/admin/statistics')
};

// Analytics API
export const analyticsAPI = {
  getUserAnalytics: () => api.get('/analytics/user'),
  getInfrastructure: () => api.get('/analytics/infrastructure')
};

// Geocoding (Free - Nominatim)
export const geocodeAPI = {
  search: async (query) => {
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: query,
          format: 'json',
          limit: 5
        },
        headers: {
          'User-Agent': 'ChargePilot-AI/1.0'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  },
  reverse: async (lat, lon) => {
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
        params: {
          lat,
          lon,
          format: 'json'
        },
        headers: {
          'User-Agent': 'ChargePilot-AI/1.0'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return { display_name: `${lat}, ${lon}` };
    }
  }
};

export default api;