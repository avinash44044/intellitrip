import React, { useState } from 'react';
import { tripAPI, travelDNAAPI, testAPI as testAPIService } from '../services/api';

const APITest = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runTest = async (testName, apiCall) => {
    setLoading(true);
    try {
      console.log(`Testing ${testName}...`);
      const result = await apiCall();
      console.log(`${testName} result:`, result);
      setResults(prev => ({
        ...prev,
        [testName]: { success: true, data: result }
      }));
    } catch (error) {
      console.error(`${testName} error:`, error);
      setResults(prev => ({
        ...prev,
        [testName]: { success: false, error: error.message }
      }));
    } finally {
      setLoading(false);
    }
  };

  const testHealthCheck = () => {
    runTest('Health Check', async () => {
      const response = await fetch('http://localhost:5000/api/health');
      return await response.json();
    });
  };

  const testAuthCheck = () => {
    runTest('Auth Check', async () => {
      const response = await fetch('http://localhost:5000/api/test-auth', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return await response.json();
    });
  };

  const testTripHistory = () => {
    runTest('Trip History', () => tripAPI.getTripHistory());
  };

  const testTravelDNA = () => {
    runTest('Travel DNA', () => travelDNAAPI.getTravelDNAProfile());
  };

  const testClearEndpoint = () => {
    runTest('Clear Endpoint Test', () => testAPIService.clearAllData());
  };

  const createTestTravelDNA = () => {
    const testQuizResults = {
      adventure: 0.75,  // 0-1 scale as expected by backend
      culture: 0.60,
      foodie: 0.80,
      // relaxation is calculated from adventure in the backend
      budget: 'mid-range',
      pace: 'moderate'
    };
    runTest('Create Test Travel DNA', () => travelDNAAPI.createTravelDNA(testQuizResults));
  };

  const clearAllData = async () => {
    setLoading(true);
    try {
      console.log('Clearing all user data from backend...');
      
      // Clear data from backend
      const backendResult = await testAPIService.clearAllData();
      console.log('Backend clear result:', backendResult);
      
      // Also clear localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('travelDNA_') || key.includes('trip_')) {
          localStorage.removeItem(key);
        }
      });
      
      setResults(prev => ({
        ...prev,
        'Clear All Data': { 
          success: true, 
          data: {
            backend: backendResult,
            localStorage: 'Cleared Travel DNA and trip data from localStorage'
          }
        }
      }));
      
      // Clear previous test results to show fresh state
      setTimeout(() => {
        setResults({});
        // Notify user to refresh the page or go back to dashboard
        alert('✅ All data cleared successfully! Go back to Dashboard to see the changes.');
      }, 2000);
      
    } catch (error) {
      console.error('Clear data error:', error);
      setResults(prev => ({
        ...prev,
        'Clear All Data': { success: false, error: error.message || 'Failed to clear data' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const createTestTrip = () => {
    const testTrip = {
      destination: 'Test City',
      startDate: '2024-08-01',
      endDate: '2024-08-05',
      budget: 50000,
      travelers: 2,
      accommodation: 'hotel',
      transportation: 'flight',
      itinerary: {
        dailyItinerary: [
          {
            day: 1,
            date: '2024-08-01',
            theme: 'Arrival & Exploration',
            activities: [
              {
                activity: 'City Walking Tour',
                location: 'Downtown Test City',
                description: 'Explore the historic downtown area',
                cost: 1500,
                type: 'culture',
                duration: '3 hours',
                time: '10:00 AM',
                status: 'active'
              }
            ]
          }
        ]
      },
      travelDNA: {
        adventure: 75,
        culture: 60,
        foodie: 80,
        relaxation: 40
      },
      generatedBy: 'test'
    };
    runTest('Create Test Trip', () => tripAPI.createTrip(testTrip));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>API Test Panel</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testHealthCheck} disabled={loading}>
          Test Health Check
        </button>
        <button onClick={testAuthCheck} disabled={loading} style={{ marginLeft: '10px' }}>
          Test Auth Check
        </button>
        <button onClick={testTripHistory} disabled={loading} style={{ marginLeft: '10px' }}>
          Test Trip History
        </button>
        <button onClick={testTravelDNA} disabled={loading} style={{ marginLeft: '10px' }}>
          Test Travel DNA
        </button>
        <button onClick={testClearEndpoint} disabled={loading} style={{ marginLeft: '10px', background: '#f39c12' }}>
          Test Clear Endpoint
        </button>
      </div>

      <div style={{ marginBottom: '20px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
        <h3>Create Test Data:</h3>
        <button onClick={createTestTravelDNA} disabled={loading}>
          Create Test Travel DNA
        </button>
        <button onClick={createTestTrip} disabled={loading} style={{ marginLeft: '10px' }}>
          Create Test Trip
        </button>
      </div>

      <div style={{ marginBottom: '20px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
        <h3 style={{ color: '#e74c3c' }}>⚠️ Danger Zone:</h3>
        <p style={{ fontSize: '14px', color: '#666' }}>
          This will permanently delete ALL your Travel DNA and Trip data from both backend and localStorage.
        </p>
        <button onClick={clearAllData} disabled={loading} style={{ 
          background: '#e74c3c', 
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}>
          🗑️ Clear All Data (Backend + LocalStorage)
        </button>
      </div>

      {loading && <p>Testing...</p>}

      <div>
        <h3>Results:</h3>
        {Object.entries(results).map(([testName, result]) => (
          <div key={testName} style={{ 
            marginBottom: '15px', 
            padding: '10px', 
            border: '1px solid #ccc',
            borderRadius: '5px',
            backgroundColor: result.success ? '#d4edda' : '#f8d7da'
          }}>
            <h4>{testName}: {result.success ? '✅ Success' : '❌ Failed'}</h4>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(result.success ? result.data : result.error, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default APITest;