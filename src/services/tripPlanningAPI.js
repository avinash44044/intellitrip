// Trip Planning API Service
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

class TripPlanningAPI {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth token to requests
    this.axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Generate personalized trip plan
  async planTrip(tripData) {
    try {
      const response = await this.axios.post('/plan-trip', tripData);
      return response.data;
    } catch (error) {
      console.error('Error planning trip:', error);
      throw error;
    }
  }

  // Save Travel DNA profile
  async saveTravelDNA(userId, travelDNA) {
    try {
      const response = await this.axios.post('/travel-dna', {
        userId,
        travelDNA
      });
      return response.data;
    } catch (error) {
      console.error('Error saving Travel DNA:', error);
      throw error;
    }
  }

  // Get Travel DNA profile
  async getTravelDNA(userId) {
    try {
      const response = await this.axios.get(`/travel-dna/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting Travel DNA:', error);
      throw error;
    }
  }

  // Save trip plan
  async saveTripPlan(tripPlan) {
    try {
      const response = await this.axios.post('/trip-plans', tripPlan);
      return response.data;
    } catch (error) {
      console.error('Error saving trip plan:', error);
      throw error;
    }
  }

  // Get user's trip plans
  async getTripPlans(userId) {
    try {
      const response = await this.axios.get(`/trip-plans/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting trip plans:', error);
      throw error;
    }
  }

  // Update activity feedback (done/skipped)
  async updateActivityFeedback(tripPlanId, activityId, feedback) {
    try {
      const response = await this.axios.post('/activity-feedback', {
        tripPlanId,
        activityId,
        feedback
      });
      return response.data;
    } catch (error) {
      console.error('Error updating activity feedback:', error);
      throw error;
    }
  }
}

export const tripPlanningAPI = new TripPlanningAPI();