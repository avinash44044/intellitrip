import React, { useState, useEffect } from 'react';
import { travelDNAAPI } from '../services/api';
import './TravelDNAProfile.css';

const TravelDNAProfile = ({ onBack, onTakeQuiz }) => {
  const [travelDNA, setTravelDNA] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    console.log('TravelDNAProfile component mounted, fetching data...');
    fetchTravelDNA();
  }, []);

  const fetchTravelDNA = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching Travel DNA profile...');
      const response = await travelDNAAPI.getTravelDNAProfile();
      console.log('Travel DNA response:', response);
      
      if (response && response.travelDNA) {
        setTravelDNA(response.travelDNA);
        console.log('Travel DNA set successfully:', response.travelDNA);
      } else {
        console.log('No Travel DNA found in response');
        setError('No Travel DNA profile found. Please take the quiz first.');
      }
    } catch (error) {
      console.error('Failed to fetch Travel DNA:', error);
      if (error.message === 'Travel DNA not found') {
        setError('No Travel DNA profile found. Please take the quiz first to create your profile.');
      } else {
        setError(error.message || 'Failed to load your Travel DNA profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPersonalityDescription = (travelStyle) => {
    const descriptions = {
      explorer: "You're an adventurous soul who thrives on excitement and new challenges. You seek out thrilling experiences and aren't afraid to step out of your comfort zone.",
      cultural_immersion: "You're deeply interested in history, art, and local traditions. You travel to learn and connect with different cultures on a meaningful level.",
      foodie_adventure: "Food is your gateway to culture! You plan trips around culinary experiences and love discovering authentic local flavors.",
      relaxation_seeker: "You travel to unwind and recharge. You prefer peaceful destinations where you can relax and enjoy life's simple pleasures.",
      balanced_traveler: "You enjoy a perfect mix of adventure, culture, food, and relaxation. You're adaptable and open to various travel experiences."
    };
    return descriptions[travelStyle] || descriptions.balanced_traveler;
  };

  const getTraitIcon = (trait) => {
    const icons = {
      adventure: '🏔️',
      culture: '🏛️',
      foodie: '🍽️',
      relaxation: '🧘'
    };
    return icons[trait] || '🌟';
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#27ae60'; // Green
    if (score >= 6) return '#f39c12'; // Orange
    if (score >= 4) return '#3498db'; // Blue
    return '#e74c3c'; // Red
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="travel-dna-profile">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your Travel DNA...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="travel-dna-profile">
        <div className="travel-dna-header">
          <button onClick={onBack} className="back-btn">
            ← Back to Dashboard
          </button>
          <h1>🧬 Your Travel DNA</h1>
        </div>
        <div className="error-message">
          <h3>❌ {error}</h3>
          <div className="error-actions">
            <button onClick={fetchTravelDNA} className="retry-btn">
              Try Again
            </button>
            {error.includes('Please take the quiz') && (
              <button 
                onClick={() => {
                  onBack(); // Go back to dashboard
                  // The dashboard will show the quiz when Travel DNA is not found
                }} 
                className="quiz-btn"
              >
                Take Travel DNA Quiz
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!travelDNA) {
    return (
      <div className="travel-dna-profile">
        <div className="no-dna">
          <h3>🧬 No Travel DNA Found</h3>
          <p>Take the Travel DNA quiz to discover your travel personality!</p>
          <button onClick={onBack} className="back-btn">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="travel-dna-profile">
      <div className="profile-header">
        <button onClick={onBack} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1>🧬 Your Travel DNA Profile</h1>
        <p className="profile-subtitle">Discover your unique travel personality</p>
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab ${selectedTab === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${selectedTab === 'evolution' ? 'active' : ''}`}
          onClick={() => setSelectedTab('evolution')}
        >
          Evolution
        </button>
        <button 
          className={`tab ${selectedTab === 'insights' ? 'active' : ''}`}
          onClick={() => setSelectedTab('insights')}
        >
          Insights
        </button>
      </div>

      {selectedTab === 'overview' && (
        <div className="tab-content">
          {/* Personality Overview */}
          <div className="personality-overview">
            <div className="travel-style-card">
              <h2>🎭 Your Travel Style</h2>
              <div className="travel-style-badge">
                {(travelDNA.personalityInsights?.profileTitle || travelDNA.personalityInsights?.travelStyle)?.replace(/_/g, ' ').toUpperCase()}
              </div>
              <p className="travel-style-description">
                {getPersonalityDescription(travelDNA.personalityInsights?.travelStyle)}
              </p>
              <div className="dominant-trait">
                <span className="trait-icon">
                  {getTraitIcon(travelDNA.personalityInsights?.dominantTrait)}
                </span>
                <span>
                  Dominant Trait: <strong>{travelDNA.personalityInsights?.dominantTrait?.toUpperCase()}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* DNA Scores */}
          <div className="dna-scores">
            <h2>📊 Your Travel DNA Scores</h2>
            <div className="scores-grid">
              <div className="score-card">
                <div className="score-header">
                  <span className="score-icon">🏔️</span>
                  <span className="score-label">Adventure</span>
                </div>
                <div className="score-bar">
                  <div 
                    className="score-fill"
                    style={{ 
                      width: `${(travelDNA.adventureScore / 10) * 100}%`,
                      backgroundColor: getScoreColor(travelDNA.adventureScore)
                    }}
                  ></div>
                </div>
                {/* Hiding numeric value per requirement */}
                <div className="score-value" style={{ display: 'none' }}>{travelDNA.adventureScore}/10</div>
              </div>

              <div className="score-card">
                <div className="score-header">
                  <span className="score-icon">🏛️</span>
                  <span className="score-label">Culture</span>
                </div>
                <div className="score-bar">
                  <div 
                    className="score-fill"
                    style={{ 
                      width: `${(travelDNA.cultureScore / 10) * 100}%`,
                      backgroundColor: getScoreColor(travelDNA.cultureScore)
                    }}
                  ></div>
                </div>
                {/* Hiding numeric value per requirement */}
                <div className="score-value" style={{ display: 'none' }}>{travelDNA.cultureScore}/10</div>
              </div>

              <div className="score-card">
                <div className="score-header">
                  <span className="score-icon">🍽️</span>
                  <span className="score-label">Foodie</span>
                </div>
                <div className="score-bar">
                  <div 
                    className="score-fill"
                    style={{ 
                      width: `${(travelDNA.foodieScore / 10) * 100}%`,
                      backgroundColor: getScoreColor(travelDNA.foodieScore)
                    }}
                  ></div>
                </div>
                {/* Hiding numeric value per requirement */}
                <div className="score-value" style={{ display: 'none' }}>{travelDNA.foodieScore}/10</div>
              </div>

              <div className="score-card">
                <div className="score-header">
                  <span className="score-icon">🧘</span>
                  <span className="score-label">Relaxation</span>
                </div>
                <div className="score-bar">
                  <div 
                    className="score-fill"
                    style={{ 
                      width: `${(travelDNA.relaxationScore / 10) * 100}%`,
                      backgroundColor: getScoreColor(travelDNA.relaxationScore)
                    }}
                  ></div>
                </div>
                {/* Hiding numeric value per requirement */}
                <div className="score-value" style={{ display: 'none' }}>{travelDNA.relaxationScore}/10</div>
              </div>
            </div>
          </div>

          {/* Trip Statistics */}
          <div className="trip-statistics">
            <h2>📈 Your Travel Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{travelDNA.tripStats?.totalTrips || 0}</div>
                <div className="stat-label">Total Trips</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{travelDNA.tripStats?.completedTrips || 0}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{travelDNA.tripStats?.totalActivitiesCompleted || 0}</div>
                <div className="stat-label">Activities Done</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{travelDNA.tripStats?.totalActivitiesSkipped || 0}</div>
                <div className="stat-label">Activities Skipped</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'evolution' && (
        <div className="tab-content">
          <div className="evolution-section">
            <h2>🔄 DNA Evolution History</h2>
            <p>See how your travel preferences have evolved based on your trip experiences.</p>
            
            {travelDNA.evolutionHistory && travelDNA.evolutionHistory.length > 0 ? (
              <div className="evolution-timeline">
                {travelDNA.evolutionHistory.slice(-10).reverse().map((entry, index) => (
                  <div key={index} className="evolution-entry">
                    <div className="evolution-date">
                      {formatDate(entry.date)}
                    </div>
                    <div className="evolution-action">
                      <span className="action-icon">
                        {entry.action === 'activity_completed' ? '✅' :
                         entry.action === 'activity_skipped' ? '❌' :
                         entry.action === 'alternative_requested' ? '🔄' : '🎯'}
                      </span>
                      <span className="action-text">
                        {entry.action.replace('_', ' ').toUpperCase()} - {entry.activityType?.toUpperCase()}
                      </span>
                    </div>
                    <div className="score-changes">
                      {Object.entries(entry.scoreChanges || {}).map(([trait, change]) => (
                        change !== 0 && (
                          <span key={trait} className={`score-change ${change > 0 ? 'positive' : 'negative'}`}>
                            {getTraitIcon(trait)} {change > 0 ? '+' : ''}{change.toFixed(1)}
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-evolution">
                <p>No evolution history yet. Start completing trips to see how your DNA evolves!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'insights' && (
        <div className="tab-content">
          <div className="insights-section">
            <h2>💡 Personalized Insights</h2>
            
            <div className="activity-preferences">
              <h3>🎯 Activity Preferences</h3>
              <div className="preferences-grid">
                <div className="preference-category">
                  <h4>✅ Most Completed</h4>
                  <div className="preference-stats">
                    {Object.entries(travelDNA.activityPreferences?.completed || {}).map(([type, count]) => (
                      <div key={type} className="preference-item">
                        <span>{getTraitIcon(type)} {type}</span>
                        <span className="count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="preference-category">
                  <h4>❌ Most Skipped</h4>
                  <div className="preference-stats">
                    {Object.entries(travelDNA.activityPreferences?.skipped || {}).map(([type, count]) => (
                      <div key={type} className="preference-item">
                        <span>{getTraitIcon(type)} {type}</span>
                        <span className="count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="preference-category">
                  <h4>🔄 Alternatives Requested</h4>
                  <div className="preference-stats">
                    {Object.entries(travelDNA.activityPreferences?.alternativesRequested || {}).map(([type, count]) => (
                      <div key={type} className="preference-item">
                        <span>{getTraitIcon(type)} {type}</span>
                        <span className="count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="recommendations">
              <h3>🎯 Recommendations for You</h3>
              <div className="recommendation-cards">
                <div className="recommendation-card">
                  <h4>🗺️ Suggested Destinations</h4>
                  <p>Based on your travel style, consider visiting:</p>
                  <ul>
                    {travelDNA.personalityInsights?.dominantTrait === 'adventure' && (
                      <>
                        <li>🏔️ Nepal - Himalayan trekking</li>
                        <li>🌋 Iceland - Adventure activities</li>
                        <li>🏄 New Zealand - Extreme sports</li>
                      </>
                    )}
                    {travelDNA.personalityInsights?.dominantTrait === 'culture' && (
                      <>
                        <li>🏛️ Greece - Ancient history</li>
                        <li>🎭 Italy - Art and architecture</li>
                        <li>🏯 Japan - Traditional culture</li>
                      </>
                    )}
                    {travelDNA.personalityInsights?.dominantTrait === 'foodie' && (
                      <>
                        <li>🍜 Thailand - Street food paradise</li>
                        <li>🍝 Italy - Culinary traditions</li>
                        <li>🥘 India - Spice adventures</li>
                      </>
                    )}
                    {travelDNA.personalityInsights?.dominantTrait === 'relaxation' && (
                      <>
                        <li>🏝️ Maldives - Beach relaxation</li>
                        <li>🧘 Bali - Wellness retreats</li>
                        <li>🌺 Hawaii - Tropical paradise</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="recommendation-card">
                  <h4>🎯 Activity Suggestions</h4>
                  <p>Activities that match your preferences:</p>
                  <ul>
                    {travelDNA.adventureScore >= 7 && <li>🧗 Rock climbing and hiking</li>}
                    {travelDNA.cultureScore >= 7 && <li>🏛️ Museum tours and historical sites</li>}
                    {travelDNA.foodieScore >= 7 && <li>🍳 Cooking classes and food tours</li>}
                    {travelDNA.relaxationScore >= 7 && <li>🧘 Spa treatments and beach time</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelDNAProfile;