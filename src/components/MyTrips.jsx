// src/components/MyTrips.jsx
import React, { useState, useEffect } from 'react';
import { tripAPI, travelDNAAPI } from '../services/api';
import TripDetailView from './TripDetailView';
import './MyTrips.css';

const MyTrips = ({ onBack }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [travelDNAProfile, setTravelDNAProfile] = useState(null);
  const [viewingTripDetail, setViewingTripDetail] = useState(null);

  useEffect(() => {
    fetchTripsAndProfile();
  }, []);

  const fetchTripsAndProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const [tripsResponse, dnaResponse] = await Promise.allSettled([
        tripAPI.getTripHistory(),
        travelDNAAPI.getTravelDNAProfile()
      ]);

      if (tripsResponse.status === 'fulfilled') {
        const trips = tripsResponse.value.trips || [];
        console.log('[MyTrips] trips from API:', trips); // 👈 DEBUG
        setTrips(trips);
      } else {
        setTrips([]);
      }

      if (dnaResponse.status === 'fulfilled') {
        const profile = dnaResponse.value.travelDNA || null;
        setTravelDNAProfile(profile);
      } else {
        setTravelDNAProfile(null);
      }

    } catch (error) {
      console.error('Error in fetchTripsAndProfile:', error);
      setError('Failed to load trips and profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const openTripDetail = (trip) => {
    console.log('[MyTrips] openTripDetail trip:', trip); // 👈 DEBUG
    setViewingTripDetail(trip);
  };

  const closeTripDetail = () => {
    setViewingTripDetail(null);
  };

  const markTripAsCompleted = async (tripId) => {
    try {
      const response = await tripAPI.markTripCompleted(tripId);
      if (response && response.trip) {
        setTrips(prevTrips =>
          prevTrips.map(trip =>
            trip._id === tripId ? { ...trip, completedAt: new Date().toISOString() } : trip
          )
        );
        alert('🎉 Congratulations! Trip marked as completed!');
      }
    } catch (error) {
      console.error('Failed to mark trip as completed:', error);
      setTrips(prevTrips =>
        prevTrips.map(trip =>
          trip._id === tripId ? { ...trip, completedAt: new Date().toISOString() } : trip
        )
      );
      alert('🎉 Congratulations! Trip marked as completed!');
    }
  };

  const handleTripUpdate = (updatedTrip) => {
    setTrips(prevTrips =>
      prevTrips.map(trip =>
        trip._id === updatedTrip._id ? updatedTrip : trip
      )
    );
  };

  // Helper: map icon string -> emoji
  const getWeatherIcon = (icon) => {
    switch (icon) {
      case 'clear': return '☀️';
      case 'partly-cloudy': return '⛅';
      case 'cloudy': return '☁️';
      case 'fog': return '🌫️';
      case 'drizzle': return '🌦️';
      case 'freezing-drizzle': return '🌧️';
      case 'rain': return '🌧️';
      case 'freezing-rain': return '🌧️';
      case 'snow': return '🌨️';
      case 'snow-showers': return '🌨️';
      case 'showers': return '🌦️';
      case 'thunder': return '⛈️';
      case 'thunder-hail': return '⛈️';
      default: return '🌤️';
    }
  };

  if (viewingTripDetail) {
    return (
      <TripDetailView
        trip={viewingTripDetail}
        onBack={closeTripDetail}
        onTripUpdate={handleTripUpdate}
      />
    );
  }

  const completedTripsCount = trips.filter(trip => trip.completedAt).length;
  const createdItinerariesCount = trips.length;

  return (
    <div className="my-trips-container">
      <div className="my-trips-header">
        <button onClick={onBack} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1>🧳 My Travel Journey</h1>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your trips...</p>
        </div>
      )}

      {error && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={fetchTripsAndProfile} className="retry-btn">
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="user-statistics">
            <div className="stat-item">
              <span className="stat-icon">🏆</span>
              <div className="stat-info">
                <span className="stat-number">{completedTripsCount}</span>
                <span className="stat-label">Trips Completed</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📋</span>
              <div className="stat-info">
                <span className="stat-number">{createdItinerariesCount}</span>
                <span className="stat-label">Itineraries Created</span>
              </div>
            </div>
          </div>

          <div className="trips-section">
            <div className="trips-header">
              <h2>🗺️ Your Trips ({trips.length})</h2>
            </div>

            {trips.length === 0 ? (
              <div className="no-trips">
                <div className="no-trips-icon">✈️</div>
                <h3>No trips yet!</h3>
                <p>Start planning your first adventure to see it here.</p>
              </div>
            ) : (
              <div className="trips-grid">
                {trips.map((trip) => {
                  const firstDay = trip.itinerary?.dailyItinerary?.[0];
                  const firstDayWeather = firstDay?.weather || null;

                  console.log(
                    '[MyTrips] trip weather debug:',
                    trip.destination,
                    firstDayWeather
                  ); // 👈 DEBUG

                  const weatherTooltip = firstDayWeather
                    ? `${firstDayWeather.summary || ''} | Min ${firstDayWeather.tempMinC ?? '-'}°C / Max ${firstDayWeather.tempMaxC ?? '-'}°C` +
                      (firstDayWeather.precipitationChance != null
                        ? ` | Rain ${(firstDayWeather.precipitationChance * 100).toFixed(0)}%`
                        : '')
                    : '';

                  return (
                    <div key={trip._id} className="trip-card">
                      <div className="trip-header">
                        <div>
                          <h3>{trip.destination}</h3>
                          <div className="trip-dates">
                            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                          </div>
                        </div>

                        {/* Compact weather badge */}
                        {firstDayWeather && (
                          <div
                            className="trip-weather-badge"
                            title={weatherTooltip}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 8px',
                              borderRadius: '999px',
                              background: 'rgba(255,255,255,0.12)',
                              fontSize: '0.85rem'
                            }}
                          >
                            <span style={{ marginRight: 6 }}>
                              {getWeatherIcon(firstDayWeather.icon)}
                            </span>
                            <span>
                              {firstDayWeather.tempMinC != null &&
                              firstDayWeather.tempMaxC != null
                                ? `${Math.round(firstDayWeather.tempMinC)}°/${Math.round(
                                    firstDayWeather.tempMaxC
                                  )}°C`
                                : firstDayWeather.summary}
                              {firstDayWeather.precipitationChance != null && (
                                <span style={{ marginLeft: 4, opacity: 0.8 }}>
                                  • {(firstDayWeather.precipitationChance * 100).toFixed(0)}% rain
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="trip-details">
                        <div className="trip-budget">
                          <span className="budget-label">Budget:</span>
                          <span className="budget-value">
                            ₹{trip.budget?.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="trip-stats">
                          <div className="stat">
                            <span className="stat-icon">📋</span>
                            <span>{trip.totalActivities || 0} Activities</span>
                          </div>
                          <div className="stat">
                            <span className="stat-icon">✅</span>
                            <span>{trip.completedActivities || 0} Done</span>
                          </div>
                          <div className="stat">
                            <span className="stat-icon">⏭️</span>
                            <span>{trip.skippedActivities || 0} Skipped</span>
                          </div>
                        </div>
                      </div>

                      <div className="trip-actions">
                        {!trip.completedAt && (
                          <button
                            onClick={() => markTripAsCompleted(trip._id)}
                            className="complete-trip-btn"
                          >
                            ✅ Mark as Completed
                          </button>
                        )}

                        <button
                          onClick={() => openTripDetail(trip)}
                          className="open-trip-btn"
                        >
                          🔍 Open Trip
                        </button>
                      </div>

                      <div className="trip-created">
                        <span>Created: {formatDate(trip.createdAt)}</span>
                        {trip.completedAt && (
                          <span className="completed-badge">
                            ✅ Completed: {formatDate(trip.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MyTrips;
