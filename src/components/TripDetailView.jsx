import React, { useState, useEffect } from 'react';
import { tripAPI, travelDNAAPI } from '../services/api';
import './TripDetailView.css';
import { normalizeActivityType, getActivityTypeClass, getActivityTypeIcon, getActivityTypeLabel } from './ui/activityTypeUtils';

const TripDetailView = ({ trip, onBack, onTripUpdate }) => {
  const [tripData, setTripData] = useState(trip);
  const [loading, setLoading] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [alternativeActivity, setAlternativeActivity] = useState(null);
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);

  useEffect(() => {
    setTripData(trip);
    console.log('[TripDetailView] tripData on mount:', trip);
  console.log('[TripDetailView] first day weather:',
    trip?.itinerary?.dailyItinerary?.[0]?.weather
  );
  }, [trip]);

  const handleActivityAction = async (dayIndex, activityIndex, action) => {
    setLoading(true);
    try {
      console.log(`Performing ${action} on activity:`, { dayIndex, activityIndex, tripId: tripData._id });
      let response;
      
      switch (action) {
        case 'done':
          response = await tripAPI.markActivityDone(tripData._id, dayIndex, activityIndex);
          break;
        case 'skip':
          response = await tripAPI.skipActivity(tripData._id, dayIndex, activityIndex);
          break;
        case 'alternative':
          response = await tripAPI.requestAlternative(tripData._id, dayIndex, activityIndex);
          if (response.alternativeActivity) {
            setAlternativeActivity(response.alternativeActivity);
            setShowAlternativeModal(true);
          }
          break;
        default:
          console.error('Unknown action:', action);
          return;
      }

      console.log('Activity action response:', response);

      // Update local trip data
      if (response && response.trip) {
        setTripData(response.trip);
        
        // Check if trip is completed
        if (response.tripCompleted) {
          setCompletionMessage('🎉 Hurray! Your trip is completed!');
          setTimeout(() => {
            setCompletionMessage('');
            onTripUpdate(response.trip);
          }, 3000);
        } else {
          onTripUpdate(response.trip);
        }
      } else {
        console.error('Invalid response from server:', response);
        alert('Unexpected response from server. Please try again.');
      }

    } catch (error) {
      console.error(`Failed to ${action} activity:`, error);
      alert(`Failed to ${action} activity: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const getActivityStatusIcon = (status) => {
    switch (status) {
      case 'done': return '✅';
      case 'skipped': return '❌';
      default: return '⏳';
    }
  };

  const getActivityStatusColor = (status) => {
    switch (status) {
      case 'done': return '#27ae60';
      case 'skipped': return '#e74c3c';
      default: return '#3498db';
    }
  };

  const calculateProgress = () => {
    const total = tripData.totalActivities || 0;
    const completed = tripData.completedActivities || 0;
    const skipped = tripData.skippedActivities || 0;
    const processed = completed + skipped;
    return total > 0 ? Math.round((processed / total) * 100) : 0;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const acceptAlternative = async () => {
    if (!alternativeActivity) return;
    setLoading(true);
    try {
      const response = await tripAPI.acceptAlternative(tripData._id, alternativeActivity.dayIndex ?? 0, alternativeActivity.activityIndex ?? 0, alternativeActivity);
      if (response && response.trip) {
        setTripData(response.trip);
        onTripUpdate(response.trip);
        setShowAlternativeModal(false);
        setAlternativeActivity(null);
      } else {
        alert('Failed to accept alternative.');
      }
    } catch (error) {
      console.error('Failed to accept alternative:', error);
      alert('Failed to accept alternative. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trip-detail-view">
      {/* Completion Message Overlay */}
      {completionMessage && (
        <div className="completion-overlay">
          <div className="completion-message">
            <h2>{completionMessage}</h2>
            <div className="celebration-animation">🎊🎉🎊</div>
          </div>
        </div>
      )}

      {/* Alternative Activity Modal */}
      {showAlternativeModal && alternativeActivity && (
        <div className="modal-overlay">
          <div className="alternative-modal">
            <div className="modal-header">
              <h3>✨ Alternative Activity Suggestion</h3>
              <button 
                className="close-modal"
                onClick={() => setShowAlternativeModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="alternative-activity">
                <h4>{alternativeActivity.activity}</h4>
                <p><strong>Location:</strong> {alternativeActivity.location}</p>
                <p><strong>Description:</strong> {alternativeActivity.description}</p>
                <p><strong>Duration:</strong> {alternativeActivity.duration}</p>
                <p><strong>Cost:</strong> ₹{alternativeActivity.cost}</p>
                <p><strong>Type:</strong> {alternativeActivity.type}</p>
              </div>
              <div className="modal-actions">
                <button 
                  className="accept-btn"
                  onClick={acceptAlternative}
                >
                  Accept Alternative
                </button>
                <button 
                  className="decline-btn"
                  onClick={() => setShowAlternativeModal(false)}
                >
                  Keep Original
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="trip-detail-header">
        <button onClick={onBack} className="back-btn">
          ← Back to My Trips
        </button>
        <div className="trip-title">
          <h1>📍 {tripData.destination}</h1>
          <div className="trip-meta">
            <span>{formatDate(tripData.startDate)} - {formatDate(tripData.endDate)}</span>
            <span>•</span>
            <span>{getDuration(tripData.startDate, tripData.endDate)} days</span>
            <span>•</span>
            <span>₹{tripData.budget?.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="trip-progress-section">
        <div className="progress-header">
          <h3>🎯 Trip Progress</h3>
          <span className="progress-percentage">{calculateProgress()}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${calculateProgress()}%` }}
          ></div>
        </div>
        <div className="progress-stats">
          <div className="stat">
            <span className="stat-icon">✅</span>
            <span>{tripData.completedActivities || 0} Done</span>
          </div>
          <div className="stat">
            <span className="stat-icon">❌</span>
            <span>{tripData.skippedActivities || 0} Skipped</span>
          </div>
          <div className="stat">
            <span className="stat-icon">⏳</span>
            <span>{(tripData.totalActivities || 0) - (tripData.completedActivities || 0) - (tripData.skippedActivities || 0)} Remaining</span>
          </div>
        </div>
      </div>

      <div className="itinerary-section">
        <h3>📅 Daily Itinerary</h3>
        {tripData.itinerary?.dailyItinerary?.map((day, dayIndex) => (
          <div key={dayIndex} className="day-card">
            <div className="day-header">
              <h4>Day {day.day} - {day.theme}</h4>
              <span className="day-date">{day.date}</span>

              {/* ***** NEW CODE BLOCK FOR WEATHER START ***** */}
              {day.weather && (
                <div className="day-weather" title={`${day.weather.summary || ''} | Min ${day.weather.tempMinC ?? '-'}°C / Max ${day.weather.tempMaxC ?? '-'}°C${day.weather.precipitationChance != null ? ` | Rain ${(day.weather.precipitationChance*100).toFixed(0)}%` : ''}`}>
                  <span className="weather-icon" style={{ marginLeft: '8px' }}>
                    {day.weather.icon === 'clear' ? '☀️' :
                     day.weather.icon === 'partly-cloudy' ? '⛅' :
                     day.weather.icon === 'cloudy' ? '☁️' :
                     day.weather.icon === 'fog' ? '🌫️' :
                     day.weather.icon === 'drizzle' ? '🌦️' :
                     day.weather.icon === 'freezing-drizzle' ? '🌧️' :
                     day.weather.icon === 'rain' ? '🌧️' :
                     day.weather.icon === 'freezing-rain' ? '🌧️' :
                     day.weather.icon === 'snow' ? '🌨️' :
                     day.weather.icon === 'snow-showers' ? '🌨️' :
                     day.weather.icon === 'showers' ? '🌦️' :
                     day.weather.icon === 'thunder' ? '⛈️' :
                     day.weather.icon === 'thunder-hail' ? '⛈️' : '🌤️'}
                  </span>
                  <span className="weather-text" style={{ marginLeft: '6px' }}>
                    {day.weather.tempMinC != null && day.weather.tempMaxC != null
                      ? `${Math.round(day.weather.tempMinC)}°/${Math.round(day.weather.tempMaxC)}°C`
                      : day.weather.summary}
                    {day.weather.precipitationChance != null && (
                      <span style={{ marginLeft: '6px', opacity: 0.8 }}>
                        • {(day.weather.precipitationChance * 100).toFixed(0)}% rain
                      </span>
                    )}
                  </span>
                </div>
              )}
              {/* ***** NEW CODE BLOCK FOR WEATHER END ***** */}
            </div>
            
            <div className="activities-list">
              {day.activities?.map((activity, activityIndex) => (
                <div 
                  key={activityIndex} 
                  className={`activity-card ${activity.status || 'active'}`}
                >
                  <div className="activity-header">
                    <div className="activity-status">
                      <span 
                        className="status-icon"
                        style={{ color: getActivityStatusColor(activity.status) }}
                      >
                        {getActivityStatusIcon(activity.status)}
                      </span>
                    </div>
                    <div className="activity-info">
                      <h5>{activity.activity}</h5>
                      <p className="activity-location">📍 {activity.location}</p>
                      <p className="activity-description">{activity.description}</p>
                    </div>
                  </div>
                  
                  <div className="activity-details">
                    <div className="activity-meta">
                      <span className="activity-time">🕐 {activity.time}</span>
                      <span className="activity-duration">⏱️ {activity.duration}</span>
                      <span className="activity-cost">💰 ₹{activity.cost}</span>
                      {(() => {
                        const normalizedType = normalizeActivityType(activity);
                        const icon = getActivityTypeIcon(normalizedType);
                        const label = getActivityTypeLabel(normalizedType);
                        return (
                          <span className={`activity-type ${getActivityTypeClass(normalizedType)}`}>
                            {icon} {label}
                          </span>
                        );
                      })()}
                    </div>

                    {/* ***** NEW CODE BLOCK FOR ENRICHMENT START ***** */}
                    {(activity?.map?.mapsUrl || activity?.rating || activity?.crowd?.level || (activity?.events?.length > 0)) && (
                      <div className="activity-enrichment">
                        {/* Map preview + link */}
                        {activity?.map?.mapsUrl && (
                          <div className="map-block">
                            {activity?.map?.staticMapUrl && (
                              <img className="map-preview" src={activity.map.staticMapUrl} alt="Map preview" />
                            )}
                            <a className="maps-link" href={activity.map.mapsUrl} target="_blank" rel="noreferrer">🗺️ Open in Google Maps</a>
                          </div>
                        )}

                        {/* Rating */}
                        {activity?.rating && (
                          <div className="rating-block" title={activity.ratingCount ? `${activity.rating} (${activity.ratingCount})` : `${activity.rating}`}>
                            <span className="rating-stars">⭐ {Number(activity.rating).toFixed(1)}</span>
                            {activity.ratingCount ? <span className="rating-count">({activity.ratingCount.toLocaleString()})</span> : null}
                          </div>
                        )}

                        {/* Crowd */}
                        {activity?.crowd?.level && (
                          <div className="crowd-block">
                            <span className={`crowd-pill ${activity.crowd.level.toLowerCase()}`}>👥 {activity.crowd.level}</span>
                            {activity.crowd.reasons?.length ? (
                              <span className="crowd-reasons">• {activity.crowd.reasons.join(', ')}</span>
                            ) : null}
                          </div>
                        )}

                        {/* Events */}
                        {activity?.events?.length > 0 && (
                          <div className="events-block">
                            <span className="events-title">🎉 Nearby Festivals/Hotspots:</span>
                            <ul className="events-list">
                              {activity.events.map((ev, i) => (
                                <li key={i}>
                                  {ev.url ? (
                                    <a href={ev.url} target="_blank" rel="noreferrer">{ev.name}</a>
                                  ) : (
                                    <span>{ev.name}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {/* ***** NEW CODE BLOCK FOR ENRICHMENT END ***** */}
                    
                    {activity.status === 'active' && (
                      <div className="activity-actions">
                        <button
                          className="action-btn done-btn"
                          onClick={() => handleActivityAction(dayIndex, activityIndex, 'done')}
                          disabled={loading}
                        >
                          ✅ Mark as Done
                        </button>
                        <button
                          className="action-btn skip-btn"
                          onClick={() => handleActivityAction(dayIndex, activityIndex, 'skip')}
                          disabled={loading}
                        >
                          🔁 Skip
                        </button>
                        <button
                          className="action-btn alternative-btn"
                          onClick={() => handleActivityAction(dayIndex, activityIndex, 'alternative')}
                          disabled={loading}
                        >
                          ✨ Suggest Alternative
                        </button>
                      </div>
                    )}
                    
                    {activity.status === 'done' && activity.completedAt && (
                      <div className="activity-timestamp">
                        ✅ Completed on {new Date(activity.completedAt).toLocaleDateString()}
                      </div>
                    )}
                    
                    {activity.status === 'skipped' && activity.skippedAt && (
                      <div className="activity-timestamp">
                        ❌ Skipped on {new Date(activity.skippedAt).toLocaleDateString()}
                      </div>
                    )}
                    
                    {activity.alternativesRequested > 0 && (
                      <div className="alternatives-count">
                        🔄 {activity.alternativesRequested} alternative{activity.alternativesRequested > 1 ? 's' : ''} requested
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {day.meals && day.meals.length > 0 && (
              <div className="meals-section">
                <h5>🍽️ Meals</h5>
                <div className="meals-list">
                  {day.meals.map((meal, mealIndex) => (
                    <div key={mealIndex} className="meal-card">
                      <span className="meal-type">{meal.type}</span>
                      <span className="meal-restaurant">{meal.restaurant}</span>
                      <span className="meal-cuisine">{meal.cuisine}</span>
                      <span className="meal-cost">₹{meal.cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {day.accommodation && (
              <div className="accommodation-section">
                <h5>🏨 Accommodation</h5>
                <div className="accommodation-card">
                  <span className="accommodation-name">{day.accommodation.name}</span>
                  <span className="accommodation-type">{day.accommodation.type}</span>
                  <span className="accommodation-location">{day.accommodation.location}</span>
                  <span className="accommodation-cost">₹{day.accommodation.cost}/night</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {tripData.itinerary?.recommendations && (
        <div className="recommendations-section">
          <h3>💡 Travel Recommendations</h3>
          
          {tripData.itinerary.recommendations.bestTimeToVisit && (
            <div className="recommendation-card">
              <h4>🌤️ Best Time to Visit</h4>
              <p>{tripData.itinerary.recommendations.bestTimeToVisit}</p>
            </div>
          )}
          
          {tripData.itinerary.recommendations.localTips && tripData.itinerary.recommendations.localTips.length > 0 && (
            <div className="recommendation-card">
              <h4>💡 Local Tips</h4>
              <ul>
                {tripData.itinerary.recommendations.localTips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          
          {tripData.itinerary.recommendations.packingList && tripData.itinerary.recommendations.packingList.length > 0 && (
            <div className="recommendation-card">
              <h4>🎒 Packing List</h4>
              <ul>
                {tripData.itinerary.recommendations.packingList.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          
          {tripData.itinerary.recommendations.culturalEtiquette && tripData.itinerary.recommendations.culturalEtiquette.length > 0 && (
            <div className="recommendation-card">
              <h4>🤝 Cultural Etiquette</h4>
              <ul>
                {tripData.itinerary.recommendations.culturalEtiquette.map((etiquette, index) => (
                  <li key={index}>{etiquette}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Processing your action...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetailView;