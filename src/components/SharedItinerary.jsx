import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './SharedItinerary.css';
import { normalizeActivityType, getActivityTypeClass, getActivityTypeIcon, getActivityTypeLabel } from './ui/activityTypeUtils';

const SharedItinerary = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSharedItinerary = () => {
      try {
        // Try to load from localStorage first
        const sharedData = localStorage.getItem(`shared_${shareId}`);
        
        if (sharedData) {
          const parsedData = JSON.parse(sharedData);
          setItinerary(parsedData);
        } else {
          // If not found in localStorage, try to decode from shareId
          try {
            const decodedData = JSON.parse(atob(shareId));
            setItinerary(decodedData);
          } catch (decodeError) {
            setError('Invalid or expired share link');
          }
        }
      } catch (err) {
        console.error('Error loading shared itinerary:', err);
        setError('Failed to load shared itinerary');
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      loadSharedItinerary();
    } else {
      setError('No share ID provided');
      setLoading(false);
    }
  }, [shareId]);

  if (loading) {
    return (
      <div className="shared-itinerary-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h3>Loading shared itinerary...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shared-itinerary-page">
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="home-btn">
            🏠 Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="shared-itinerary-page">
        <div className="error-container">
          <div className="error-icon">🔍</div>
          <h3>Itinerary not found</h3>
          <p>The shared itinerary could not be found or may have expired.</p>
          <button onClick={() => navigate('/')} className="home-btn">
            🏠 Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shared-itinerary-page">
      <div className="shared-header">
        <div className="header-content">
          <button onClick={() => navigate('/')} className="home-btn">
            🏠 IntelliTrip
          </button>
          <div className="share-badge">
            📤 Shared Itinerary
          </div>
        </div>
      </div>

      <div className="shared-content">
        <div className="itinerary-header">
          <h1>🎯 {itinerary.destination} Itinerary</h1>
          <div className="trip-overview">
            <div className="overview-item">
              <span className="label">Duration:</span>
              <span className="value">{itinerary.totalDays} days</span>
            </div>
            <div className="overview-item">
              <span className="label">Total Cost:</span>
              <span className="value cost">₹{itinerary.estimatedTotalCost?.toLocaleString('en-IN')}</span>
            </div>
            <div className="overview-item">
              <span className="label">Shared:</span>
              <span className="value">{new Date(itinerary.sharedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        {itinerary.costBreakdown && (
          <div className="cost-breakdown">
            <h3>💰 Cost Breakdown</h3>
            <div className="cost-items">
              <div className="cost-item">
                <span>🏨 Accommodation</span>
                <span>₹{itinerary.costBreakdown.accommodation?.toLocaleString('en-IN')}</span>
              </div>
              <div className="cost-item">
                <span>🍽️ Food</span>
                <span>₹{itinerary.costBreakdown.food?.toLocaleString('en-IN')}</span>
              </div>
              <div className="cost-item">
                <span>🎯 Activities</span>
                <span>₹{itinerary.costBreakdown.activities?.toLocaleString('en-IN')}</span>
              </div>
              <div className="cost-item">
                <span>🚗 Transportation</span>
                <span>₹{itinerary.costBreakdown.transportation?.toLocaleString('en-IN')}</span>
              </div>
              <div className="cost-item">
                <span>📦 Miscellaneous</span>
                <span>₹{itinerary.costBreakdown.miscellaneous?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Daily Itinerary */}
        <div className="daily-itinerary">
          <h3>📅 Day-by-Day Itinerary</h3>
          {itinerary.dailyItinerary?.map((day, index) => (
            <div key={index} className="day-card">
              <div className="day-header">
                <h4>Day {index + 1}: {day.theme}</h4>
                <p>{day.location}</p>
              </div>
              
              <div className="day-content">
                {/* Activities */}
                <div className="activities-section">
                  <h5>🎯 Activities</h5>
                  {day.activities?.map((activity, actIndex) => (
                    <div key={actIndex} className="activity-item">
                      <div className="activity-time">{activity.time}</div>
                      <div className="activity-details">
                        <div className="activity-header">
                          <h6>{activity.activity}</h6>
                          <span className="activity-cost">₹{activity.cost}</span>
                        </div>
                        <p className="activity-description">{activity.description}</p>
                        <div className="activity-meta">
                          <span className="activity-location">📍 {activity.location}</span>
                          <span className="activity-duration">⏱️ {activity.duration}</span>
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
                      </div>
                    </div>
                  ))}
                </div>

                {/* Meals */}
                {day.meals && day.meals.length > 0 && (
                  <div className="meals-section">
                    <h5>🍽️ Meals</h5>
                    {day.meals.map((meal, mealIndex) => (
                      <div key={mealIndex} className="meal-item">
                        <span className="meal-type">{meal.type}</span>
                        <span className="meal-details">
                          {meal.restaurant} - {meal.cuisine}
                        </span>
                        <span className="meal-cost">₹{meal.cost}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Accommodation */}
                {day.accommodation && (
                  <div className="accommodation-section">
                    <h5>🏨 Accommodation</h5>
                    <div className="accommodation-item">
                      <span className="accommodation-name">{day.accommodation.name}</span>
                      <span className="accommodation-location">{day.accommodation.location}</span>
                      <span className="accommodation-cost">₹{day.accommodation.cost}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {itinerary.recommendations && (
          <div className="recommendations-section">
            <h3>💡 Recommendations</h3>
            <div className="recommendation-grid">
              {itinerary.recommendations.localTips && (
                <div className="recommendation-card">
                  <h4>💡 Local Tips</h4>
                  <ul>
                    {itinerary.recommendations.localTips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {itinerary.recommendations.packingList && (
                <div className="recommendation-card">
                  <h4>🎒 Packing List</h4>
                  <ul>
                    {itinerary.recommendations.packingList.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {itinerary.recommendations.culturalEtiquette && (
                <div className="recommendation-card">
                  <h4>🙏 Cultural Etiquette</h4>
                  <ul>
                    {itinerary.recommendations.culturalEtiquette.map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="cta-section">
          <div className="cta-content">
            <h3>✨ Create Your Own Itinerary</h3>
            <p>Loved this itinerary? Create your own personalized travel plan with IntelliTrip!</p>
            <button onClick={() => navigate('/')} className="cta-btn">
              🚀 Start Planning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedItinerary;