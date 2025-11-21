// Cache Service for Backend Itinerary Caching
const API_BASE_URL = 'http://localhost:5000/api';

// Get auth token from localStorage
const getAuthToken = () => {
  const token = localStorage.getItem('token');
  return token ? `Bearer ${token}` : null;
};

// Check if itinerary exists in backend cache
export const checkCachedItinerary = async (destination, travelDNA, tripParams) => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.log('No auth token available for cache check');
      return { cached: false };
    }

    const response = await fetch(`${API_BASE_URL}/itinerary/check-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({
        destination,
        travelDNA,
        tripParams
      })
    });

    if (!response.ok) {
      throw new Error(`Cache check failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Cache check result:', data);
    return data;
  } catch (error) {
    console.error('Error checking cache:', error);
    return { cached: false };
  }
};

// Store itinerary in backend cache
export const cacheItinerary = async (destination, travelDNA, tripParams, itinerary, generatedBy = 'ai') => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.log('No auth token available for caching');
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/itinerary/cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({
        destination,
        travelDNA,
        tripParams,
        itinerary,
        generatedBy
      })
    });

    if (!response.ok) {
      throw new Error(`Cache store failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Itinerary cached successfully:', data);
    return true;
  } catch (error) {
    console.error('Error caching itinerary:', error);
    return false;
  }
};

// Get cache statistics for the user
export const getCacheStats = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { count: 0, destinations: [], totalAccess: 0 };
    }

    const response = await fetch(`${API_BASE_URL}/itinerary/cache-stats`, {
      method: 'GET',
      headers: {
        'Authorization': token
      }
    });

    if (!response.ok) {
      throw new Error(`Cache stats failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { count: 0, destinations: [], totalAccess: 0 };
  }
};

// Clear cache for a specific destination or all cache
export const clearCache = async (destination = null) => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.log('No auth token available for cache clearing');
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/itinerary/clear-cache`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(destination ? { destination } : {})
    });

    if (!response.ok) {
      throw new Error(`Cache clear failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Cache cleared:', data);
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};