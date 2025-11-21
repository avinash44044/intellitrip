import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authAPI, travelDNAAPI } from '../services/api';
import { flightService } from '../services/flightService';
import Logo from './Logo';
import TripPlanningPage from './TripPlanningPage';
import MyTrips from './MyTrips';
import TravelDNAProfile from './TravelDNAProfile';
import APITest from './APITest';
import PreplannedItineraries from './PreplannedItineraries';
import './Dashboard.css';

// Flight Search Form Component
const FlightSearchForm = ({ onSearch, isSearching, resetTrigger }) => {
  const [searchData, setSearchData] = useState({
    from: '',
    to: '',
    departDate: '',
    returnDate: '',
    passengers: 1,
    tripType: 'roundtrip'
  });

  // Reset form when resetTrigger changes
  useEffect(() => {
    if (resetTrigger) {
      setSearchData({
        from: '',
        to: '',
        departDate: '',
        returnDate: '',
        passengers: 1,
        tripType: 'roundtrip'
      });
    }
  }, [resetTrigger]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    console.log('Input changed:', name, value);
    setSearchData(prevData => ({
      ...prevData,
      [name]: value
    }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (searchData.from && searchData.to && searchData.departDate) {
      onSearch(searchData);
    }
  }, [searchData, onSearch]);

  return (
    <form className='flight-search-form' onSubmit={handleSubmit}>
      <div className='form-row'>
        <div className='form-group'>
          <label>From</label>
          <input
            type='text'
            name='from'
            placeholder='Departure city'
            value={searchData.from}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className='form-group'>
          <label>To</label>
          <input
            type='text'
            name='to'
            placeholder='Destination city'
            value={searchData.to}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>
      
      <div className='form-row'>
        <div className='form-group'>
          <label>Departure Date</label>
          <input
            type='date'
            name='departDate'
            value={searchData.departDate}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className='form-group'>
          <label>Return Date</label>
          <input
            type='date'
            name='returnDate'
            value={searchData.returnDate}
            onChange={handleInputChange}
          />
        </div>
      </div>
      
      <div className='form-row'>
        <div className='form-group'>
          <label>Passengers</label>
          <select name='passengers' value={searchData.passengers} onChange={handleInputChange}>
            <option value={1}>1 Passenger</option>
            <option value={2}>2 Passengers</option>
            <option value={3}>3 Passengers</option>
            <option value={4}>4 Passengers</option>
          </select>
        </div>
        <div className='form-group'>
          <label>Trip Type</label>
          <select name='tripType' value={searchData.tripType} onChange={handleInputChange}>
            <option value='roundtrip'>Round Trip</option>
            <option value='oneway'>One Way</option>
          </select>
        </div>
      </div>
      
      <button type='submit' className='search-flights-btn' disabled={isSearching}>
        {isSearching ? 'Searching...' : 'Search Flights'}
      </button>
    </form>
  );
};

// Flight Card Component
const FlightCard = ({ flight }) => {
  const [showBookingOptions, setShowBookingOptions] = useState(false);

  const handleBookingOptionClick = (url) => {
    window.open(url, '_blank');
  };

  return (
    <div className='flight-card'>
      <div className='flight-header'>
        <div className='airline-info'>
          <h4>{flight.airline}</h4>
          <span className='flight-number'>{flight.flightNumber}</span>
        </div>
        <div className='flight-price'>
          <span className='price'>${flight.price}</span>
          <span className='per-person'>per person</span>
        </div>
      </div>
      
      <div className='flight-details'>
        <div className='flight-time'>
          <div className='departure'>
            <span className='time'>{flight.departure.time}</span>
            <span className='airport'>{flight.departure.airport}</span>
          </div>
          <div className='flight-info'>
            <span className='duration'>{flight.duration}</span>
            <div className='flight-path'>
              <div className='path-line'></div>
              <span className='aircraft'></span>
            </div>
            <span className='stops'>{flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</span>
          </div>
          <div className='arrival'>
            <span className='time'>{flight.arrival.time}</span>
            <span className='airport'>{flight.arrival.airport}</span>
          </div>
        </div>
      </div>
      
      <div className='flight-footer'>
        <span className='aircraft-type'>{flight.aircraft}</span>
        <div className='booking-section'>
          <button 
            className='book-flight-btn' 
            onClick={() => setShowBookingOptions(!showBookingOptions)}
          >
            Book Now
          </button>

          
          {showBookingOptions && (
            <div className='booking-options'>
              <h4>Choose your booking site:</h4>
              <div className='booking-buttons'>
                <button 
                  className='booking-option-btn expedia'
                  onClick={() => handleBookingOptionClick(flight.bookingUrl.expedia)}
                >
                  <span className='booking-logo'></span>
                  Expedia
                </button>

                <button 
                  className='booking-option-btn kayak'
                  onClick={() => handleBookingOptionClick(flight.bookingUrl.kayak)}
                >
                  <span className='booking-logo'></span>
                  Kayak
                </button>

                <button 
                  className='booking-option-btn skyscanner'
                  onClick={() => handleBookingOptionClick(flight.bookingUrl.skyscanner)}
                >
                  <span className='booking-logo'></span>
                  Skyscanner
                </button>

                <button 
                  className='booking-option-btn booking'
                  onClick={() => handleBookingOptionClick(flight.bookingUrl.booking)}
                >
                  <span className='booking-logo'></span>
                  Booking.com
                </button>

                <button 
                  className='booking-option-btn momondo'
                  onClick={() => handleBookingOptionClick(flight.bookingUrl.momondo)}
                >
                  <span className='booking-logo'></span>
                  Momondo
                </button>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Travel DNA Quiz Component
const TravelDNAQuiz = ({ isOpen, onClose, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  const questions = [
    {
      id: 'adventure',
      question: 'Choose your vibe for the day:',
      subtitle: 'What sounds most exciting to you?',
      options: [
        { value: 0.2, label: 'A lazy brunch by the beach', emoji: '🧉' },
        { value: 0.4, label: 'A scenic nature walk', emoji: '🚶‍♂️' },
        { value: 0.6, label: 'A short hike with a viewpoint', emoji: '🥾' },
        { value: 0.8, label: 'River rafting or zipline', emoji: '🧗' },
        { value: 1.0, label: 'Summit a peak or dive deep!', emoji: '🏔️' }
      ]
    },
    {
      id: 'culture',
      question: 'How would you explore the local culture?',
      subtitle: 'Pick what attracts you the most:',
      options: [
        { value: 0.2, label: 'Trendy cafes and nightlife', emoji: '🍸' },
        { value: 0.4, label: 'A couple of famous landmarks', emoji: '📸' },
        { value: 0.6, label: 'Museum + old town walking tour', emoji: '🏛️' },
        { value: 0.8, label: 'Local craft workshop or heritage walk', emoji: '🧵' },
        { value: 1.0, label: 'Festival, folklore, and deep history', emoji: '🎎' }
      ]
    },
    {
      id: 'foodie',
      question: 'Your perfect food plan looks like…',
      subtitle: 'Follow your taste buds:',
      options: [
        { value: 0.2, label: 'Quick bites — keep it simple', emoji: '🥪' },
        { value: 0.4, label: 'Try a couple of local dishes', emoji: '🍛' },
        { value: 0.6, label: 'Street food crawl', emoji: '🍢' },
        { value: 0.8, label: 'Cooking class or chef’s tasting', emoji: '👨‍🍳' },
        { value: 1.0, label: 'Food tour + fine dining', emoji: '🍽️' }
      ]
    },
    {
      id: 'budget',
      question: 'How do you like to spend on trips?',
      subtitle: 'Be honest with your wallet:',
      options: [
        { value: 0.2, label: 'Backpacker mode — save as much as possible', emoji: '🎒' },
        { value: 0.4, label: 'Budget stays, occasional splurges', emoji: '🏨' },
        { value: 0.6, label: 'Balanced — comfort at good value', emoji: '⚖️' },
        { value: 0.8, label: 'Comfortable — pay more for better experiences', emoji: '💳' },
        { value: 1.0, label: 'Premium — go big for the best', emoji: '💎' }
      ]
    },
    {
      id: 'pace',
      question: 'What’s your ideal daily pace?',
      subtitle: 'How packed should your day be?',
      options: [
        { value: 'relaxed', label: 'Relaxed — slow mornings, lots of downtime', emoji: '😌' },
        { value: 'balanced', label: 'Balanced — mix of chill and activity', emoji: '⚖️' },
        { value: 'active', label: 'Active — sunrise to sunset, let’s go!', emoji: '⚡' }
      ]
    }
  ];

  const handleAnswer = (answer) => {
    // Ensure final answer is included when completing the quiz
    const updatedAnswers = {
      ...answers,
      [questions[currentQuestion].id]: answer
    };
    setAnswers(updatedAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Quiz complete with all answers captured
      onComplete(updatedAnswers);
    }
  };

  const goBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className='travel-dna-quiz'>
      <div className='modal-overlay' onClick={onClose}></div>
      <div className='modal-content quiz-modal-content'>
        <div className='modal-header'>
          <h2> Discover Your Travel DNA</h2>
          <button className='close-modal' onClick={onClose}>×</button>
        </div>
        
        <div className='quiz-progress'>
          <div className='progress-bar'>
            <div className='progress-fill' style={{ width: `${progress}%` }}></div>
          </div>
          <span className='progress-text'>Question {currentQuestion + 1} of {questions.length}</span>
        </div>

        <div className='quiz-content'>
          <div className='question-section'>
            <h3>{questions[currentQuestion].question}</h3>
            <p className='question-subtitle'>{questions[currentQuestion].subtitle}</p>
          </div>

          <div className='options-section'>
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                className='quiz-option'
                onClick={() => handleAnswer(option.value)}
              >
                <span className='option-emoji'>{option.emoji}</span>
                <span className='option-text'>{option.label}</span>
              </button>

            ))}
          </div>

          <div className='quiz-navigation'>
            {currentQuestion > 0 && (
              <button className='quiz-back-btn' onClick={goBack}>
                ← Back
              </button>

            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Trip Planning Modal Component
const TripPlanModal = ({ isOpen, onClose, onGenerate, isGenerating, userDNA }) => {
  const [tripData, setTripData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    budget: 1000,
    travelers: 1
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTripData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tripData.destination && tripData.startDate && tripData.endDate) {
      onGenerate(tripData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='trip-plan-modal'>
      <div className='modal-overlay' onClick={onClose}></div>
      <div className='modal-content trip-modal-content'>
        <div className='modal-header'>
          <h2>🗺️ Plan Your Perfect Trip</h2>
          <button className='close-modal' onClick={onClose}>×</button>
        </div>

        {userDNA && (
          <div className='dna-summary'>
            <h4>Your Travel DNA Profile:</h4>
            <div className='dna-traits'>
              <span className='dna-trait'>Adventure: {Math.round(userDNA.adventure * 100)}%</span>
              <span className='dna-trait'>Culture: {Math.round(userDNA.culture * 100)}%</span>
              <span className='dna-trait'>Foodie: {Math.round(userDNA.foodie * 100)}%</span>
              <span className='dna-trait'>Budget: {Math.round(userDNA.budget * 100)}%</span>
              <span className='dna-trait'>Pace: {userDNA.pace}</span>
            </div>
          </div>
        )}

        <form className='trip-plan-form' onSubmit={handleSubmit}>
          <div className='form-group'>
            <label>Destination</label>
            <input
              type='text'
              name='destination'
              placeholder='Where do you want to go?'
              value={tripData.destination}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className='form-row'>
            <div className='form-group'>
              <label>Start Date</label>
              <input
                type='date'
                name='startDate'
                value={tripData.startDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className='form-group'>
              <label>End Date</label>
              <input
                type='date'
                name='endDate'
                value={tripData.endDate}
                onChange={handleInputChange}
                min={tripData.startDate}
                required
              />
            </div>
          </div>

          <div className='form-row'>
            <div className='form-group'>
              <label>Budget (USD)</label>
              <input
                type='number'
                name='budget'
                value={tripData.budget}
                onChange={handleInputChange}
                min='100'
                step='50'
              />
            </div>
            <div className='form-group'>
              <label>Number of Travelers</label>
              <select name='travelers' value={tripData.travelers} onChange={handleInputChange}>
                <option value={1}>1 person</option>
                <option value={2}>2 people</option>
                <option value={3}>3 people</option>
                <option value={4}>4 people</option>
                <option value={5}>5+ people</option>
              </select>
            </div>
          </div>

          <button type='submit' className='generate-trip-btn' disabled={isGenerating}>
            {isGenerating ? 'Generating Your Perfect Trip...' : 'Generate Trip Plan'}
          </button>

        </form>
      </div>
    </div>
  );
};

// Trip Preview Modal Component
const TripPreviewModal = ({ isOpen, onClose, tripPlan }) => {
  if (!isOpen || !tripPlan) return null;

  return (
    <div className='trip-preview-modal'>
      <div className='modal-overlay' onClick={onClose}></div>
      <div className='modal-content trip-preview-content'>
        <div className='modal-header'>
          <h2> Your Personalized Trip Plan</h2>
          <button className='close-modal' onClick={onClose}>×</button>
        </div>

        <div className='trip-overview'>
          <div className='trip-header'>
            <h3>{tripPlan.destination}</h3>
            <div className='trip-dates'>
              {new Date(tripPlan.startDate).toLocaleDateString()} - {new Date(tripPlan.endDate).toLocaleDateString()}
            </div>
            <div className='trip-duration'>{tripPlan.days} days</div>
            <div className='estimated-cost'>Estimated Cost: ${tripPlan.estimatedCost}</div>
          </div>

          <div className='itinerary-section'>
            <h4>Daily Itinerary</h4>
            {tripPlan.itinerary.map((day, index) => (
              <div key={index} className='day-card'>
                <div className='day-header'>
                  <h5>Day {day.day}</h5>
                  <span className='day-date'>{day.date}</span>
                </div>
                <div className='day-activities'>
                  {day.activities.map((activity, actIndex) => (
                    <div key={actIndex} className='activity-item'>
                      <div className='activity-time'>{activity.time}</div>
                      <div className='activity-details'>
                        <div className='activity-name'>{activity.activity}</div>
                        <div className='activity-meta'>
                          <span className={`activity-type ${activity.type}`}>{activity.type}</span>
                          <span className='activity-duration'>{activity.duration}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className='trip-actions'>
            <button className='save-trip-btn'>Save Trip Plan</button>
            <button className='share-trip-btn'>Share with Friends</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Review Modal Component
const ReviewModal = ({ isOpen, onClose, onSubmit }) => {
  const [reviewData, setReviewData] = useState({
    name: '',
    location: '',
    destination: '',
    rating: 5,
    review: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReviewData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (reviewData.name && reviewData.location && reviewData.destination && reviewData.review) {
      onSubmit(reviewData);
      setReviewData({
        name: '',
        location: '',
        destination: '',
        rating: 5,
        review: ''
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className='review-modal'>
      <div className='modal-overlay' onClick={onClose}></div>
      <div className='modal-content review-modal-content'>
        <div className='modal-header'>
          <h2> Write a Review</h2>
          <button className='close-modal' onClick={onClose}>×</button>
        </div>
        
        <form className='review-form' onSubmit={handleSubmit}>
          <div className='form-row'>
            <div className='form-group'>
              <label>Your Name</label>
              <input
                type='text'
                name='name'
                placeholder='Enter your name'
                value={reviewData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className='form-group'>
              <label>Your Location</label>
              <input
                type='text'
                name='location'
                placeholder='City, Country'
                value={reviewData.location}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div className='form-row'>
            <div className='form-group'>
              <label>Destination Visited</label>
              <input
                type='text'
                name='destination'
                placeholder='Where did you travel?'
                value={reviewData.destination}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className='form-group'>
              <label>Rating</label>
              <select name='rating' value={reviewData.rating} onChange={handleInputChange}>
                <option value={5}>★★★★★ (5 stars)</option>
                <option value={4}>★★★★☆ (4 stars)</option>
                <option value={3}>★★★☆☆ (3 stars)</option>
                <option value={2}>★★☆☆☆ (2 stars)</option>
                <option value={1}>★☆☆☆☆ (1 star)</option>
              </select>
            </div>
          </div>
          
          <div className='form-group'>
            <label>Your Review</label>
            <textarea
              name='review'
              placeholder='Share your travel experience with IntelliTrip...'
              value={reviewData.review}
              onChange={handleInputChange}
              rows={4}
              required
            />
          </div>
          
          <button type='submit' className='submit-review-btn'>
            Submit Review
          </button>

        </form>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedCountries, setExpandedCountries] = useState(new Set());
  const [currentLanguageSet, setCurrentLanguageSet] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showFlightBooking, setShowFlightBooking] = useState(false);
  const [flightSearchResults, setFlightSearchResults] = useState([]);
  const [isSearchingFlights, setIsSearchingFlights] = useState(false);
  const [resetFormTrigger, setResetFormTrigger] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showTripPlanModal, setShowTripPlanModal] = useState(false);
  const [showTravelDNAQuiz, setShowTravelDNAQuiz] = useState(false);
  const [showTripPlanningPage, setShowTripPlanningPage] = useState(false);
  const [showMyTrips, setShowMyTrips] = useState(false);
  const [showTravelDNAProfile, setShowTravelDNAProfile] = useState(false);
  const [showAPITest, setShowAPITest] = useState(false);
  const [tripPlans, setTripPlans] = useState([]);
  const [userTravelDNA, setUserTravelDNA] = useState(null);
  const [currentTripPlan, setCurrentTripPlan] = useState(null);
  const [isGeneratingTrip, setIsGeneratingTrip] = useState(false);
  const [loadingTravelDNA, setLoadingTravelDNA] = useState(false);

  // Load user's Travel DNA on component mount
  useEffect(() => {
    const loadTravelDNA = async () => {
      if (user?.email) {
        console.log('Loading Travel DNA for user:', user.email);
        setLoadingTravelDNA(true);
        try {
          // Try to load from backend first
          console.log('Attempting to fetch Travel DNA from backend...');
          const response = await travelDNAAPI.getTravelDNAProfile();
          console.log('Travel DNA backend response:', response);
          if (response && response.travelDNA) {
            console.log('Setting Travel DNA from backend:', response.travelDNA);
            setUserTravelDNA(response.travelDNA);
            setLoadingTravelDNA(false);
            return;
          }
        } catch (error) {
          console.log('No Travel DNA found in backend, error:', error);
          console.log('Checking localStorage...');
        }

        // Fallback to localStorage
        const savedDNA = localStorage.getItem(`travelDNA_${user.email}`);
        if (savedDNA) {
          console.log('Found Travel DNA in localStorage, setting it...');
          setUserTravelDNA(JSON.parse(savedDNA));
        } else {
          console.log('No Travel DNA found in localStorage either');
        }
        setLoadingTravelDNA(false);
      }
    };

    loadTravelDNA();
  }, [user]);
  const [reviews, setReviews] = useState([
    {
      id: 1,
      name: "Sarah Johnson",
      location: "New York, USA",
      rating: 5,
      review: "IntelliTrip made my vacation planning so easy! The language tips were incredibly helpful during my trip to Japan.",
      date: "2024-01-15",
      destination: "Tokyo, Japan"
    },
    {
      id: 2,
      name: "Michael Chen",
      location: "London, UK",
      rating: 4,
      review: "Great platform for travel planning. The flight booking feature saved me hours of searching across different sites.",
      date: "2024-01-10",
      destination: "Paris, France"
    },
    {
      id: 3,
      name: "Emma Rodriguez",
      location: "Madrid, Spain",
      rating: 5,
      review: "Love the cultural insights and travel facts! It really enhanced my understanding of the places I visited.",
      date: "2024-01-08",
      destination: "Bali, Indonesia"
    },
    {
      id: 4,
      name: "David Thompson",
      location: "Toronto, Canada",
      rating: 5,
      review: "The💬 Essential Travel Phrases feature is a game-changer! I felt so much more confident communicating during my European adventure.",
      date: "2024-01-20",
      destination: "Rome, Italy"
    },
    {
      id: 5,
      name: "Lisa Wang",
      location: "Sydney, Australia",
      rating: 4,
      review: "Fantastic travel companion app! The personalized recommendations and cultural tips made my solo trip unforgettable.",
      date: "2024-01-25",
      destination: "Bangkok, Thailand"
    }
  ]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isReviewPaused, setIsReviewPaused] = useState(false);

  const travelFacts = [
    'Did you know? The Great Wall of China is not visible from space with the naked eye, contrary to popular belief!',
    'Amazing fact: There are more possible games of chess than there are atoms in the observable universe!',
    'Travel wonder: The shortest commercial flight in the world lasts only 90 seconds between two Scottish islands!',
    'Incredible: Japan has a square watermelon farm that grows cube-shaped watermelons for easier storage!',
    'Fun fact: The city of Venice is built on more than 100 small islands connected by over 400 bridges!',
    'Did you know? Antarctica is the only continent without time zones - researchers use their home country time!',
    'Amazing: The Northern Lights occur about 60-70 miles above Earth and can be seen from space!',
    'Travel fact: There are more than 7,000 languages spoken around the world today!',
    'Incredible: The Sahara Desert is larger than the entire United States!',
    'Did you know? Mount Everest grows about 4 millimeters taller each year!',
    'Amazing fact: There are pink lakes in Australia due to algae and bacteria!',
    'Travel wonder: Iceland runs almost entirely on renewable energy from geothermal and hydroelectric sources!'
  ];

  const dashboardSlides = [
    {
      url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Mountain Adventure',
      description: 'Explore breathtaking mountain ranges around the world'
    },
    {
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Tropical Paradise',
      description: 'Discover pristine beaches and crystal clear waters'
    },
    {
      url: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'City Exploration',
      description: 'Immerse yourself in vibrant urban cultures'
    },
    {
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Island Getaway',
      description: 'Escape to secluded islands and hidden gems'
    },
    {
      url: 'https://images.unsplash.com/photo-1549144511-f099e773c147?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Cultural Heritage',
      description: 'Experience ancient temples and historical wonders'
    },
    {
      url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'European Charm',
      description: 'Stroll through romantic European cities'
    },
    {
      url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Modern Marvels',
      description: 'Witness architectural wonders of the modern world'
    },
    {
      url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Desert Adventures',
      description: 'Journey through vast deserts and oasis towns'
    }
  ];

  const languageTips = [
    { 
      country: 'France', 
      flag: '🇫🇷',
      phrases: [
        { phrase: 'Bonjour', meaning: 'Hello', pronunciation: 'bon-ZHOOR', lang: 'fr' },
        { phrase: 'Merci', meaning: 'Thank you', pronunciation: 'mer-SEE', lang: 'fr' },
        { phrase: 'Au revoir', meaning: 'Goodbye', pronunciation: 'oh ruh-VWAHR', lang: 'fr' },
        { phrase: 'Excusez-moi', meaning: 'Excuse me', pronunciation: 'ex-koo-zay MWAH', lang: 'fr' }
      ]
    },
    { 
      country: 'Spain', 
      flag: '🇪🇸',
      phrases: [
        { phrase: 'Hola', meaning: 'Hello', pronunciation: 'OH-lah', lang: 'es' },
        { phrase: 'Gracias', meaning: 'Thank you', pronunciation: 'GRAH-see-ahs', lang: 'es' },
        { phrase: 'Adi?s', meaning: 'Goodbye', pronunciation: 'ah-dee-OHS', lang: 'es' },
        { phrase: 'Por favor', meaning: 'Please', pronunciation: 'por fah-VOR', lang: 'es' }
      ]
    },
    { 
      country: 'Italy', 
      flag: '🇮🇹',
      phrases: [
        { phrase: 'Ciao', meaning: 'Hello/Goodbye', pronunciation: 'chow', lang: 'it' },
        { phrase: 'Grazie', meaning: 'Thank you', pronunciation: 'GRAH-tsee-eh', lang: 'it' },
        { phrase: 'Prego', meaning: 'You are welcome', pronunciation: 'PREH-go', lang: 'it' },
        { phrase: 'Scusi', meaning: 'Excuse me', pronunciation: 'SKOO-zee', lang: 'it' }
      ]
    },
    { 
      country: 'Germany', 
      flag: '🇩🇪',
      phrases: [
        { phrase: 'Guten Tag', meaning: 'Good day', pronunciation: 'GOO-ten tahk', lang: 'de' },
        { phrase: 'Danke', meaning: 'Thank you', pronunciation: 'DAHN-keh', lang: 'de' },
        { phrase: 'Auf Wiedersehen', meaning: 'Goodbye', pronunciation: 'owf VEE-der-zayn', lang: 'de' },
        { phrase: 'Bitte', meaning: 'Please', pronunciation: 'BIT-teh', lang: 'de' }
      ]
    },
    { 
      country: 'Japan', 
      flag: '🇯🇵',
      phrases: [
        { phrase: 'Konnichiwa', meaning: 'Hello', pronunciation: 'kon-nee-chee-wah', lang: 'ja' },
        { phrase: 'Arigato', meaning: 'Thank you', pronunciation: 'ah-ree-gah-toh', lang: 'ja' },
        { phrase: 'Sayonara', meaning: 'Goodbye', pronunciation: 'sah-yoh-nah-rah', lang: 'ja' },
        { phrase: 'Sumimasen', meaning: 'Excuse me', pronunciation: 'soo-mee-mah-sen', lang: 'ja' }
      ]
    },
    { 
      country: 'China', 
      flag: '🇨🇳',
      phrases: [
        { phrase: 'Ni hao', meaning: 'Hello', pronunciation: 'nee how', lang: 'zh' },
        { phrase: 'Xie xie', meaning: 'Thank you', pronunciation: 'sheh sheh', lang: 'zh' },
        { phrase: 'Zai jian', meaning: 'Goodbye', pronunciation: 'dzai jee-en', lang: 'zh' },
        { phrase: 'Qing', meaning: 'Please', pronunciation: 'ching', lang: 'zh' }
      ]
    },
    { 
      country: 'Brazil', 
      flag: '🇧🇷',
      phrases: [
        { phrase: 'Ol?', meaning: 'Hello', pronunciation: 'oh-LAH', lang: 'pt' },
        { phrase: 'Obrigado', meaning: 'Thank you (male)', pronunciation: 'oh-bree-GAH-doo', lang: 'pt' },
        { phrase: 'Tchau', meaning: 'Goodbye', pronunciation: 'chow', lang: 'pt' },
        { phrase: 'Por favor', meaning: 'Please', pronunciation: 'por fah-VOR', lang: 'pt' }
      ]
    },
    { 
      country: 'Russia', 
      flag: '🇷🇺',
      phrases: [
        { phrase: 'Privet', meaning: 'Hello', pronunciation: 'pree-VYET', lang: 'ru' },
        { phrase: 'Spasibo', meaning: 'Thank you', pronunciation: 'spah-SEE-bah', lang: 'ru' },
        { phrase: 'Do svidaniya', meaning: 'Goodbye', pronunciation: 'dah svee-DAH-nee-yah', lang: 'ru' },
        { phrase: 'Pozhaluysta', meaning: 'Please', pronunciation: 'pah-ZHAH-loo-stah', lang: 'ru' }
      ]
    }
  ];

  useEffect(() => {
    const factInterval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % travelFacts.length);
    }, 5000);
    
    const slideInterval = setInterval(() => {
      if (!isPaused) {
        setCurrentSlide((prev) => (prev + 1) % dashboardSlides.length);
      }
    }, 3500);

    const reviewInterval = setInterval(() => {
      if (!isReviewPaused) {
        setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
      }
    }, 4000); // Change review every 4 seconds
    
    return () => {
      clearInterval(factInterval);
      clearInterval(slideInterval);
      clearInterval(reviewInterval);
    };
  }, [travelFacts.length, dashboardSlides.length, isPaused, isReviewPaused, reviews.length]);

  const handleLogout = () => {
    authAPI.logout();
    logout();
    navigate('/');
  };

  const handlePlanTrip = () => {
    // Check if user has Travel DNA profile
    if (userTravelDNA) {
      // User already has Travel DNA, show trip planning page
      setShowTripPlanningPage(true);
    } else {
      // Show Travel DNA quiz first
      setShowTravelDNAQuiz(true);
    }
  };

  const scrollToFeatures = () => {
    const featuresSection = document.querySelector('.features-above-reviews');
    if (featuresSection) {
      featuresSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const handleMenuClick = (item) => {
    switch (item) {
      case 'My Trips':
        setShowMyTrips(true);
        break;
      case 'Write Review':
        setShowReviewModal(true);
        break;
      case 'Travel DNA':
        // Always try to show profile first, it will handle the "not found" case
        setShowTravelDNAProfile(true);
        break;
      case 'API Test':
        setShowAPITest(true);
        break;

      default:
        break;
    }
  };

  const speakPhrase = (phrase, lang) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = lang;
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    } else {
      alert('Speech synthesis not supported in your browser');
    }
  };

  const toggleCountryDropdown = (countryIndex) => {
    setExpandedCountries(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(countryIndex)) {
        // If country is already expanded, collapse it
        newExpanded.delete(countryIndex);
      } else {
        // If country is not expanded, expand it
        newExpanded.add(countryIndex);
      }
      return newExpanded;
    });
  };

  // Language carousel navigation
  const COUNTRIES_PER_SET = 4;
  const totalSets = Math.ceil(languageTips.length / COUNTRIES_PER_SET);
  
  const nextLanguageSet = () => {
    setCurrentLanguageSet(prev => (prev + 1) % totalSets);
    // Keep expanded countries when navigating - no need to clear them
  };
  
  const prevLanguageSet = () => {
    setCurrentLanguageSet(prev => (prev - 1 + totalSets) % totalSets);
    // Keep expanded countries when navigating - no need to clear them
  };
  
  const getCurrentLanguageSet = () => {
    const startIndex = currentLanguageSet * COUNTRIES_PER_SET;
    return languageTips.slice(startIndex, startIndex + COUNTRIES_PER_SET);
  };

  const searchFlights = async (searchData) => {
    setIsSearchingFlights(true);
    
    try {
      // Use real flight service to get flight data
      const flights = await flightService.searchFlights(searchData);
      setFlightSearchResults(flights);
    } catch (error) {
      console.error('Error searching flights:', error);
      // Show error message to user
      alert('Error searching flights. Please try again.');
      setFlightSearchResults([]);
    } finally {
      setIsSearchingFlights(false);
    }
  };

  const refreshFlightSearch = () => {
    setFlightSearchResults([]);
    setIsSearchingFlights(false);
    setResetFormTrigger(prev => prev + 1); // Trigger form reset
  };

  const handleReviewSubmit = (reviewData) => {
    const newReview = {
      id: reviews.length + 1,
      name: reviewData.name,
      location: reviewData.location,
      rating: parseInt(reviewData.rating),
      review: reviewData.review,
      date: new Date().toISOString().split('T')[0],
      destination: reviewData.destination
    };
    
    setReviews(prev => [newReview, ...prev]);
    setShowReviewModal(false);
    setCurrentReviewIndex(0); // Show the new review first
    
    // Show success message
    alert('Thank you for your review! Your feedback helps other travelers.');
  };

  const handleTravelDNAComplete = async (dnaData) => {
    // Prepare data for local use (keeps numeric budget and UI pace strings for app logic)
    const localTravelDNA = {
      adventure: dnaData.adventure,
      culture: dnaData.culture,
      foodie: dnaData.foodie,
      budget: dnaData.budget, // numeric for local calculations
      pace: dnaData.pace,     // 'relaxed' | 'balanced' | 'active' for UI logic
      createdAt: new Date().toISOString()
    };

    // Map quiz values to backend enums
    const mapBudgetEnum = (val) => {
      if (typeof val === 'number') {
        if (val <= 0.4) return 'budget';
        if (val <= 0.8) return 'mid-range';
        return 'luxury';
      }
      return 'mid-range';
    };
    const mapPaceEnum = (val) => (val === 'relaxed' ? 'slow' : val === 'balanced' ? 'moderate' : 'fast');

    const backendPayload = {
      adventure: dnaData.adventure,
      culture: dnaData.culture,
      foodie: dnaData.foodie,
      budget: mapBudgetEnum(dnaData.budget), // enum required by backend
      pace: mapPaceEnum(dnaData.pace)        // enum required by backend
    };
    
    try {
      // Save to backend using API service
      await travelDNAAPI.createTravelDNA(backendPayload);
      console.log('Travel DNA saved to backend successfully');
    } catch (error) {
      console.error('Failed to save Travel DNA to backend:', error);
    }
    
    // Also save to localStorage as backup for UX
    localStorage.setItem(`travelDNA_${user?.email}`, JSON.stringify(localTravelDNA));
    setUserTravelDNA(localTravelDNA);
    setShowTravelDNAQuiz(false);
    setShowTripPlanningPage(true);
  };

  const generateTripPlan = async (tripData) => {
    setIsGeneratingTrip(true);
    
    try {
      // Call backend API to generate personalized itinerary
      const response = await fetch('/api/plan-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user?.id,
          travelDNA: userTravelDNA,
          destination: tripData.destination,
          startDate: tripData.startDate,
          endDate: tripData.endDate,
          budget: tripData.budget,
          travelers: tripData.travelers
        })
      });

      if (response.ok) {
        const tripPlan = await response.json();
        setCurrentTripPlan(tripPlan);
        setTripPlans(prev => [tripPlan, ...prev]);
      } else {
        // Fallback to mock data if API fails
        const mockTripPlan = generateMockTripPlan(tripData);
        setCurrentTripPlan(mockTripPlan);
        setTripPlans(prev => [mockTripPlan, ...prev]);
      }
    } catch (error) {
      console.error('Error generating trip plan:', error);
      // Fallback to mock data
      const mockTripPlan = generateMockTripPlan(tripData);
      setCurrentTripPlan(mockTripPlan);
      setTripPlans(prev => [mockTripPlan, ...prev]);
    } finally {
      setIsGeneratingTrip(false);
    }
  };

  const generateMockTripPlan = (tripData) => {
    const { destination, startDate, endDate } = tripData;
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      id: Date.now(),
      destination,
      startDate,
      endDate,
      days,
      personalizedFor: userTravelDNA,
      itinerary: generatePersonalizedItinerary(destination, days, userTravelDNA),
      estimatedCost: calculateEstimatedCost(days, userTravelDNA),
      createdAt: new Date().toISOString()
    };
  };

  const generatePersonalizedItinerary = (destination, days, dna) => {
    // Sample activities based on Travel DNA preferences
    const activities = {
      adventure: [
        'Mountain hiking and scenic trails',
        'Rock climbing adventure',
        'White water rafting',
        'Zip-lining through forests',
        'Bungee jumping experience',
        'Paragliding with city views'
      ],
      culture: [
        'Historical museum tours',
        'Local art gallery visits',
        'Traditional craft workshops',
        'Heritage site exploration',
        'Cultural performance shows',
        'Architecture walking tours'
      ],
      foodie: [
        'Local cooking class',
        'Street food tour',
        'Wine tasting experience',
        'Traditional market visit',
        'Fine dining restaurant',
        'Food festival participation'
      ],
      relaxation: [
        'Spa and wellness center',
        'Beach relaxation time',
        'Scenic garden walks',
        'Meditation sessions',
        'Sunset viewing spots',
        'Peaceful lake visits'
      ]
    };

    const itinerary = [];
    
    for (let day = 1; day <= days; day++) {
      const dayActivities = [];
      
      // Morning activity based on highest DNA score
      const topPreference = Object.keys(dna).reduce((a, b) => 
        typeof dna[a] === 'number' && typeof dna[b] === 'number' && dna[a] > dna[b] ? a : b
      );
      
      if (activities[topPreference]) {
        dayActivities.push({
          time: '09:00',
          activity: activities[topPreference][Math.floor(Math.random() * activities[topPreference].length)],
          type: topPreference,
          duration: '3 hours'
        });
      }

      // Afternoon activity
      if (dna.foodie > 0.6) {
        dayActivities.push({
          time: '13:00',
          activity: activities.foodie[Math.floor(Math.random() * activities.foodie.length)],
          type: 'foodie',
          duration: '2 hours'
        });
      } else if (dna.culture > 0.5) {
        dayActivities.push({
          time: '13:00',
          activity: activities.culture[Math.floor(Math.random() * activities.culture.length)],
          type: 'culture',
          duration: '2 hours'
        });
      }

      // Evening activity based on pace
      if (dna.pace === 'active') {
        dayActivities.push({
          time: '18:00',
          activity: activities.adventure[Math.floor(Math.random() * activities.adventure.length)],
          type: 'adventure',
          duration: '2 hours'
        });
      } else {
        dayActivities.push({
          time: '18:00',
          activity: activities.relaxation[Math.floor(Math.random() * activities.relaxation.length)],
          type: 'relaxation',
          duration: '2 hours'
        });
      }

      itinerary.push({
        day,
        date: new Date(Date.now() + (day - 1) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        activities: dayActivities
      });
    }

    return itinerary;
  };

  const calculateEstimatedCost = (days, dna) => {
    const baseCost = days * 100; // Base cost per day
    const budgetMultiplier = dna.budget || 0.5;
    const activityMultiplier = (dna.adventure + dna.culture + dna.foodie) / 3;
    
    return Math.round(baseCost * (1 + budgetMultiplier) * (1 + activityMultiplier));
  };

  // Show Trip Planning Page if user is in trip planning mode
  if (showTripPlanningPage && userTravelDNA) {
    return (
      <TripPlanningPage 
        userTravelDNA={userTravelDNA}
        onBack={() => setShowTripPlanningPage(false)}
      />
    );
  }

  // Show My Trips page
  if (showMyTrips) {
    return (
      <MyTrips 
        onBack={() => setShowMyTrips(false)}
      />
    );
  }

  // Show Travel DNA Profile page
  if (showTravelDNAProfile) {
    return (
      <TravelDNAProfile 
        onBack={() => {
          setShowTravelDNAProfile(false);
          // If user doesn't have Travel DNA, show quiz
          if (!userTravelDNA) {
            setShowTravelDNAQuiz(true);
          }
        }}
        onTakeQuiz={() => {
          setShowTravelDNAProfile(false);
          setShowTravelDNAQuiz(true);
        }}
      />
    );
  }


  // Show API Test page (temporary for debugging)
  if (showAPITest) {
    return (
      <div>
        <button 
          onClick={() => {
            setShowAPITest(false);
            // Refresh Travel DNA state when returning from API test
            setUserTravelDNA(null);
            // Reload Travel DNA
            const loadTravelDNA = async () => {
              if (user?.email) {
                try {
                  const response = await travelDNAAPI.getTravelDNAProfile();
                  if (response && response.travelDNA) {
                    setUserTravelDNA(response.travelDNA);
                  }
                } catch (error) {
                  console.log('No Travel DNA found after refresh');
                }
              }
            };
            loadTravelDNA();
          }} 
          style={{ margin: '20px' }}
        >
          ? Back to Dashboard
        </button>

        <APITest />
      </div>
    );
  }

  return (
    <div className='dashboard'>
      <div 
        className='dashboard-slideshow'
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {dashboardSlides.map((slide, index) => (
          <div
            key={index}
            className={`dashboard-slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.url})` }}
          >
            <div className='dashboard-slide-overlay'></div>
          </div>
        ))}
      </div>

      <header className='dashboard-header'>
        <div className='header-left'>
          <Logo size="medium" showText={true} className="logo-dark" />
        </div>
        <div className='header-center'>
          <div className='travel-fact'>
            <span className='fact-icon'>??</span>
            <p className='fact-text'>{travelFacts[currentFactIndex]}</p>
          </div>
        </div>
        <div className='header-right'>
          <button className='logout-button' onClick={handleLogout}>
            Logout
          </button>

        </div>
      </header>

      <nav className='mini-menu'>
        <button
          className='menu-item my-trips'
          onClick={() => handleMenuClick('My Trips')}
        >
          🧳 My Trips
        </button>

        <button 
          className='menu-item write-review'
          onClick={() => handleMenuClick('Write Review')}
        >
          Write Review
        </button>

        <button
          className={`menu-item travel-dna ${userTravelDNA ? 'has-dna' : ''}`}
          onClick={() => handleMenuClick('Travel DNA')}
        >
           Travel DNA
          {userTravelDNA && <span className="dna-indicator">*</span>}
        </button>
      </nav>

      <main className='dashboard-main'>
        <div className='welcome-section'>
          <h2>Welcome back, {user?.displayName || user?.name?.split(' ')[0] || 'Traveler'}!</h2>
          <p>Ready to plan your next adventure?</p>
        </div>

        <div className='simple-cta-section'>
          <button className='plan-trip-button' onClick={handlePlanTrip}>
            Plan Your Trip
          </button>

          <button className='explore-features-button' onClick={scrollToFeatures}>
            Explore Features
          </button>

        </div>
      </main>

      {/* Feature Cards Section - Above Reviews */}
      <div className='features-above-reviews'>
        <h3 className='features-section-title'> See What Else You Can Do</h3>
        <div className='feature-cards-grid'>
          <div className='feature-card'>
            <div className='card-icon'>🗺️</div>
            <h3>Discover Destinations</h3>
            <p>Explore amazing places around the world</p>
          </div>
          <div className='feature-card clickable-card' onClick={() => setShowFlightBooking(true)}>
            <div className='card-icon'>✈️</div>
            <h3>Book Flights</h3>
            <p>Find the best deals on flights</p>
          </div>
          <div className='feature-card'>
            <div className='card-icon'>🏨</div>
            <h3>Find Hotels</h3>
            <p>Comfortable stays at great prices</p>
          </div>
          <div className='feature-card'>
            <div className='card-icon'>👥</div>
            <h3>Crowd Prediction</h3>
            <p>Check crowd levels at popular destinations</p>
          </div>
          <div className='feature-card'>
            <div className='card-icon'>🌤️</div>
            <h3>Weather Forecast</h3>
            <p>Get accurate weather predictions for your trip</p>
          </div>
          <div className='feature-card'>
            <div className='card-icon'>🍽️</div>
            <h3>Perfect Food</h3>
            <p>Discover local cuisine and best restaurants</p>
          </div>
          <div className='feature-card'>
            <div className='card-icon'>📸</div>
            <h3>Photo Spots</h3>
            <p>Find the most Instagram-worthy locations</p>
          </div>
          <div className='feature-card'>
            <div className='card-icon'>🎭</div>
            <h3>Cultural Events</h3>
            <p>Experience local festivals and traditions</p>
          </div>
        </div>
      </div>

      {/* Preplanned Itineraries Section */}
      <div className='itineraries-section'>
        <h3 className='itineraries-title'>🗺️ Popular Preplanned Itineraries</h3>
        {/* Replace static cards with live component while preserving the section */}
        <div style={{ marginTop: 12 }}>
          <PreplannedItineraries hideHeader hideSearch />
        </div>
      </div>

      {/* Reviews Slideshow Section */}
      <div className='reviews-section'>
        <h3 className='reviews-title'> What Our Travelers Say</h3>
        <div className='reviews-grid-container'>
          <div className='reviews-grid'>
            {reviews.slice(currentReviewIndex, currentReviewIndex + 3).map((review, index) => (
              <div key={review.id} className='review-card'>
                <div className='review-header'>
                  <div className='reviewer-info'>
                    <h4>
                      {review.name}
                      {currentReviewIndex === 0 && index === 0 && (
                        <span className='new-review-badge'>New!</span>
                      )}
                    </h4>
                    <p className='reviewer-location'>{review.location}</p>
                    <p className='review-destination'>Traveled to: {review.destination}</p>
                  </div>
                  <div className='review-rating'>
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`star ${i < review.rating ? 'filled' : ''}`}>★</span>
                    ))}
                  </div>
                </div>
                <div className='review-content'>
                  <p>"{review.review}"</p>
                </div>
                <div className='review-date'>
                  {new Date(review.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Navigation for Reviews */}
          {reviews.length > 3 && (
            <div className='reviews-navigation'>
              <button 
                className='reviews-nav-btn prev-reviews'
                onClick={() => {
                  const prevIndex = currentReviewIndex - 3 < 0 ? 
                    Math.max(0, reviews.length - 3) : currentReviewIndex - 3;
                  setCurrentReviewIndex(prevIndex);
                }}
                disabled={currentReviewIndex === 0}
              >← Previous
              </button>

              
              <span className='reviews-indicator'>
                Showing {currentReviewIndex + 1}-{Math.min(currentReviewIndex + 3, reviews.length)} of {reviews.length}
              </span>
              
              <button 
                className='reviews-nav-btn next-reviews'
                onClick={() => {
                  const nextIndex = currentReviewIndex + 3 >= reviews.length ? 0 : currentReviewIndex + 3;
                  setCurrentReviewIndex(nextIndex);
                }}
                disabled={currentReviewIndex + 3 >= reviews.length}
              >
                Next →
              </button>

            </div>
          )}
        </div>
      </div>

      <div className='language-tips-section'>
        <div className='language-tips-header'>
          <h3 className='language-tips-title'>💬 Essential Travel Phrases</h3>
          <div className='language-navigation'>
            <button 
              className='nav-button prev-button' 
              onClick={prevLanguageSet}
              disabled={totalSets <= 1}
            >←</button>

            <span className='set-indicator'>
              {currentLanguageSet + 1} of {totalSets}
            </span>
            <button 
              className='nav-button next-button' 
              onClick={nextLanguageSet}
              disabled={totalSets <= 1}
            >→</button>

          </div>
        </div>
        
        <div className='language-carousel-container'>
          <div className='language-cards-grid'>
            {getCurrentLanguageSet().map((country, localIndex) => {
              const globalIndex = currentLanguageSet * COUNTRIES_PER_SET + localIndex;
              const isExpanded = expandedCountries.has(globalIndex);
              return (
                <div 
                  key={`country-${country.country}-${globalIndex}`} 
                  className={`language-card ${isExpanded ? 'expanded' : ''}`}
                  data-country={country.country}
                  data-index={globalIndex}
                >
                  <div className='card-header'>
                    <div className='country-info'>
                      <span className='country-flag-large'>{country.flag}</span>
                      <span className='country-name-large'>{country.country}</span>
                    </div>
                    <button 
                      className={`expand-button ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleCountryDropdown(globalIndex)}
                    >
                      {isExpanded ? '-' : '+'}
                    </button>

                  </div>
                  
                  <div className={`card-content ${isExpanded ? 'show' : 'hide'}`}>
                    {isExpanded && (
                      <div className='phrases-list'>
                        {country.phrases.map((tip, phraseIndex) => (
                          <div key={`${country.country}-phrase-${phraseIndex}`} className='phrase-item'>
                            <div className='phrase-row'>
                              <div className='phrase-text'>
                                <span className='phrase'>{tip.phrase}</span>
                                <span className='meaning'>({tip.meaning})</span>
                              </div>
                              <button 
                                className='speaker-btn'
                                onClick={() => speakPhrase(tip.phrase, tip.lang)}
                                title='Listen to pronunciation'>🔊</button>

                            </div>
                            <div className='pronunciation'>{tip.pronunciation}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Flight Booking Modal */}
      {showFlightBooking && (
        <div className='flight-booking-modal'>
          <div className='modal-overlay' onClick={() => setShowFlightBooking(false)}></div>
          <div className='modal-content'>
            <div className='modal-header'>
              <h2> Book Your Flight</h2>
              <div className='modal-controls'>
                <button 
                  className={`refresh-btn ${flightSearchResults.length > 0 ? 'has-results' : ''}`}
                  onClick={refreshFlightSearch}
                  title={flightSearchResults.length > 0 ? 'Clear search results and reset form' : 'Reset search form'}
                >
                  
                  {flightSearchResults.length > 0 && <span className='results-badge'>{flightSearchResults.length}</span>}
                </button>

                <button 
                  className='close-modal'
                  onClick={() => setShowFlightBooking(false)}
                  title='Close modal'
                >→</button>

              </div>
            </div>
            
            <FlightSearchForm 
              onSearch={searchFlights} 
              isSearching={isSearchingFlights} 
              resetTrigger={resetFormTrigger}
            />
            
            {isSearchingFlights && (
              <div className='flight-loading'>
                <div className='loading-spinner'></div>
                <p>Searching for the best flights...</p>
              </div>
            )}
            
            {flightSearchResults.length > 0 && !isSearchingFlights && (
              <div className='flight-results'>
                <div className='results-header'>
                  <h3>Available Flights</h3>
                  <div className='data-source-notice'>
                    <span className='notice-icon'></span>
                    <span className='notice-text'>
                      Currently showing sample data. Configure API keys in src/config/apiConfig.js for real-time flight data.
                    </span>
                  </div>
                </div>
                {flightSearchResults.map(flight => (
                  <FlightCard key={flight.id} flight={flight} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Travel DNA Quiz */}
      <TravelDNAQuiz 
        isOpen={showTravelDNAQuiz}
        onClose={() => setShowTravelDNAQuiz(false)}
        onComplete={handleTravelDNAComplete}
      />

      {/* Trip Planning Modal */}
      <TripPlanModal 
        isOpen={showTripPlanModal}
        onClose={() => setShowTripPlanModal(false)}
        onGenerate={generateTripPlan}
        isGenerating={isGeneratingTrip}
        userDNA={userTravelDNA}
      />

      {/* Trip Preview Modal */}
      <TripPreviewModal 
        isOpen={!!currentTripPlan}
        onClose={() => setCurrentTripPlan(null)}
        tripPlan={currentTripPlan}
      />

      {/* Review Modal */}
      <ReviewModal 
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleReviewSubmit}
      />

      <footer className='dashboard-footer'>
        <div className='footer-content'>
          <div className='footer-section'>
            <h4>IntelliTrip</h4>
            <p>Your AI-Powered Travel Companion</p>
          </div>
          <div className='footer-section'>
            <h4>Company</h4>
            <p>About Us</p>
            <p>Contact</p>
            <p>Careers</p>
          </div>
          <div className='footer-section'>
            <h4>Support</h4>
            <p>Help Center</p>
            <p>Privacy Policy</p>
            <p>Terms of Service</p>
          </div>
        </div>
        <div className='footer-bottom'>
          <p>&copy; 2024 IntelliTrip. All rights reserved.</p>
          <button 
            className='test-api-footer-btn'
            onClick={() => setShowAPITest(true)}
            title='Open API Test Panel'
          >
            ?? API Test
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;



