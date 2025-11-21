import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API calls
export const authAPI = {
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  },

  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  getProfile: async () => {
    try {
      const response = await api.get('/user/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get profile' };
    }
  }
};

// Trip API calls
export const tripAPI = {  
  markTripCompleted: async (tripId) => {
    try {
      // Backend currently updates status via /trips/:tripId/status
      const response = await api.put(`/trips/${tripId}/status`, { status: 'completed' });
      return response.data;
    } catch (error) {
      console.error('Error marking trip as completed:', error);
      throw error.response?.data || error;
    }
  },
  createTrip: async (tripData) => {
    try {
      const response = await api.post('/trips/create', tripData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create trip' };
    }
  },

  getTripHistory: async () => {
    try {
      const response = await api.get('/trips/history');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get trip history' };
    }
  },

  getTrip: async (tripId) => {
    try {
      const response = await api.get(`/trips/${tripId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get trip' };
    }
  },

  // Preplanned itineraries (public gallery from existing trips)
  getPreplannedItineraries: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const response = await api.get(`/preplanned-itineraries${query ? `?${query}` : ''}`);
      return response.data; // { itineraries: Trip[] }
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get preplanned itineraries' };
    }
  },

  clonePreplannedItinerary: async (tripId, { startDate, endDate } = {}) => {
    try {
      const payload = {};
      if (startDate) payload.startDate = startDate;
      if (endDate) payload.endDate = endDate;
      const response = await api.post(`/preplanned-itineraries/${tripId}/clone`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add itinerary to your trips' };
    }
  },

  updateTripStatus: async (tripId, status) => {
    try {
      const response = await api.put(`/trips/${tripId}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update trip status' };
    }
  },

  markActivityDone: async (tripId, dayIndex, activityIndex) => {
    try {
      const response = await api.post(`/trips/${tripId}/activity/${dayIndex}/${activityIndex}/done`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark activity as done' };
    }
  },

  skipActivity: async (tripId, dayIndex, activityIndex) => {
    try {
      const response = await api.post(`/trips/${tripId}/activity/${dayIndex}/${activityIndex}/skip`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to skip activity' };
    }
  },

  requestAlternative: async (tripId, dayIndex, activityIndex) => {
    try {
      const response = await api.post(`/trips/${tripId}/activity/${dayIndex}/${activityIndex}/alternative`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to request alternative' };
    }
  },

  acceptAlternative: async (tripId, dayIndex, activityIndex, alternative) => {
    try {
      const response = await api.post(`/trips/${tripId}/activity/${dayIndex}/${activityIndex}/alternative/accept`, { alternative });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to accept alternative' };
    }
  }
};

// Travel DNA API calls
export const travelDNAAPI = {
  createTravelDNA: async (quizResults) => {
    try {
      const response = await api.post('/travel-dna/create', { quizResults });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create Travel DNA' };
    }
  },

  getTravelDNAProfile: async () => {
    try {
      const response = await api.get('/travel-dna/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get Travel DNA profile' };
    }
  },

  evolveTravelDNA: async (activityType, action, tripId) => {
    try {
      const response = await api.post('/travel-dna/evolve', { activityType, action, tripId });
      return response.data;
    } catch (error) {
      console.warn('Travel DNA evolution failed:', error);
      // Don't throw error for DNA evolution to avoid breaking the main flow
      return null;
    }
  }
};

// Test API calls (for development/testing)
export const testAPI = {
  clearAllData: async () => {
    try {
      const response = await api.get('/test/clear-all-data-get');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to clear data' };
    }
  }
};

// Activity API calls
export const activityAPI = {
  trackActivity: async (activityData) => {
    try {
      const response = await api.post('/activities/track', activityData);
      return response.data;
    } catch (error) {
      console.warn('Activity tracking failed:', error);
      // Don't throw error for activity tracking to avoid breaking the main flow
      return null;
    }
  },

  getActivityStats: async (tripId) => {
    try {
      const response = await api.get(`/activities/stats/${tripId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get activity stats' };
    }
  }
};

export default api;

