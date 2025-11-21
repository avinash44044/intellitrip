const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (in production, use a proper database)
const travelDNAProfiles = new Map();
const tripPlans = new Map();
const activityFeedback = new Map();

// JWT verification middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Trip Planning Algorithm
class TripPlanningEngine {
  constructor() {
    this.destinations = {
      'paris': {
        activities: {
          adventure: [
            'Seine River kayaking',
            'Catacombs exploration',
            'Bike tour through Montmartre',
            'Rock climbing at Fontainebleau',
            'Hot air balloon ride'
          ],
          culture: [
            'Louvre Museum tour',
            'Notre-Dame Cathedral visit',
            'Versailles Palace day trip',
            'Musée d\'Orsay art collection',
            'Latin Quarter walking tour',
            'Opera house performance'
          ],
          foodie: [
            'French cooking class',
            'Wine tasting in Montmartre',
            'Cheese and charcuterie tour',
            'Michelin-starred restaurant',
            'Local market food tour',
            'Pastry making workshop'
          ],
          relaxation: [
            'Luxembourg Gardens stroll',
            'Seine river cruise',
            'Spa day at luxury hotel',
            'Picnic at Champ de Mars',
            'Café culture experience'
          ]
        },
        baseCostPerDay: 150
      },
      'tokyo': {
        activities: {
          adventure: [
            'Mount Fuji hiking',
            'Tokyo Skytree bungee jump',
            'Shibuya crossing challenge',
            'Robot restaurant experience',
            'Ninja training workshop'
          ],
          culture: [
            'Traditional tea ceremony',
            'Senso-ji Temple visit',
            'Kabuki theater performance',
            'Imperial Palace tour',
            'Meiji Shrine exploration',
            'Samurai museum visit'
          ],
          foodie: [
            'Sushi making class',
            'Ramen tour in Shibuya',
            'Tsukiji fish market visit',
            'Sake tasting experience',
            'Street food in Harajuku',
            'Kaiseki dining experience'
          ],
          relaxation: [
            'Traditional onsen visit',
            'Japanese garden meditation',
            'Shinjuku Park cherry blossoms',
            'Ryokan stay experience',
            'Zen temple meditation'
          ]
        },
        baseCostPerDay: 180
      },
      'new york': {
        activities: {
          adventure: [
            'Central Park rock climbing',
            'Brooklyn Bridge bike ride',
            'Helicopter tour of Manhattan',
            'Coney Island roller coasters',
            'High Line elevated park walk'
          ],
          culture: [
            'Metropolitan Museum of Art',
            'Broadway show experience',
            'Statue of Liberty visit',
            'Ellis Island immigration museum',
            'Guggenheim Museum tour',
            'Lincoln Center performance'
          ],
          foodie: [
            'Pizza tour in Brooklyn',
            'Deli sandwich crawl',
            'Rooftop dining experience',
            'Food truck festival',
            'Chinatown food tour',
            'Fine dining in SoHo'
          ],
          relaxation: [
            'Central Park picnic',
            'Hudson River waterfront walk',
            'Spa day in Midtown',
            'Sunset at Top of the Rock',
            'Coffee shop hopping in Greenwich Village'
          ]
        },
        baseCostPerDay: 200
      }
    };
  }

  generateItinerary(destination, days, travelDNA, budget) {
    const destKey = destination.toLowerCase().replace(/\s+/g, '');
    const destData = this.destinations[destKey] || this.destinations['paris']; // Default fallback
    const itinerary = [];

    for (let day = 1; day <= days; day++) {
      const dayActivities = this.generateDayActivities(destData, travelDNA, day);

      itinerary.push({
        day,
        date: new Date(Date.now() + (day - 1) * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),

        activities: dayActivities
      });
    }
    const estimatedCost = this.calculateCost(destData, days, travelDNA, budget);
    return {
      destination,
      days,
      itinerary,
      estimatedCost,
      personalizedFor: travelDNA
    };
  }
  
  // ***** CORRECTED FUNCTION START *****
  generateDayActivities(destData, dna, dayNumber) {
    const activities = [];
    // 1. Include ALL categories to treat them equally
    const allCategories = ['adventure', 'culture', 'foodie', 'relaxation'];

    // This helper function picks a category based on DNA scores
    const pickWeightedCategory = (availableCats) => {
      // Get the DNA scores for the available categories
      const weights = availableCats.map(cat => Math.max(0, Number(dna[cat] ?? 0)));
      const sumOfWeights = weights.reduce((a, b) => a + b, 0);

      // If all scores are zero, pick a random category to avoid errors
      if (sumOfWeights === 0) {
        return availableCats[Math.floor(Math.random() * availableCats.length)];
      }

      // Perform weighted random selection
      const random = Math.random() * sumOfWeights;
      let weightSum = 0;
      for (let i = 0; i < availableCats.length; i++) {
        weightSum += weights[i];
        if (random <= weightSum) {
          return availableCats[i];
        }
      }
      // Fallback in case of floating point inaccuracies
      return availableCats[availableCats.length - 1];
    };

    // 2. Select three activities for the day, ensuring some variety
    const chosenTypes = new Set();
    
    // Morning Activity
    const morningType = pickWeightedCategory(allCategories);
    chosenTypes.add(morningType);

    // Afternoon Activity (prioritize a different category for variety)
    let availableAfternoon = allCategories.filter(cat => !chosenTypes.has(cat));
    if (availableAfternoon.length === 0) availableAfternoon = allCategories; // Allow repeats if all used
    const afternoonType = pickWeightedCategory(availableAfternoon);
    chosenTypes.add(afternoonType);
    
    // Evening Activity (prioritize a different category for variety)
    let availableEvening = allCategories.filter(cat => !chosenTypes.has(cat));
    if (availableEvening.length === 0) availableEvening = allCategories; // Allow repeats if all used
    const eveningType = pickWeightedCategory(availableEvening);

    // 3. Define the time slots and assign the chosen activity types
    const slots = [
      { time: '09:00', type: morningType, duration: '3 hours', idSuffix: 'morning' },
      { time: '13:00', type: afternoonType, duration: '2 hours', idSuffix: 'afternoon' },
      { time: '18:00', type: eveningType, duration: '2 hours', idSuffix: 'evening' }
    ];

    for (const slot of slots) {
      const list = destData.activities?.[slot.type];
      if (Array.isArray(list) && list.length) {
        const chosen = this.selectRandomActivity(list);
        activities.push({
          time: slot.time,
          activity: chosen,
          type: slot.type,
          duration: slot.duration,
          id: `${dayNumber}-${slot.idSuffix}`
        });
      }
    }
    
    return activities;
  }
  // ***** CORRECTED FUNCTION END *****

  selectRandomActivity(activityList) {
    return activityList[Math.floor(Math.random() * activityList.length)];
  }

  calculateCost(destData, days, dna, requestedBudget) {
    const baseCost = destData.baseCostPerDay * days;
    const budgetMultiplier = (dna.budget || 0.5);
    const activityMultiplier = ((dna.adventure || 0) + (dna.culture || 0) + (dna.foodie || 0)) / 3;

    const estimatedCost = Math.round(baseCost * (1 + budgetMultiplier) * (1 + activityMultiplier * 0.5));

    // Try to stay within requested budget range
    return Math.min(estimatedCost, requestedBudget * 1.2);
  }
}
const tripEngine = new TripPlanningEngine();

// API Routes
// Generate trip plan
app.post('/api/plan-trip', verifyToken, (req, res) => {
  try {
    const { userId, travelDNA, destination, startDate, endDate, budget, travelers } = req.body;

    if (!destination || !startDate || !endDate || !travelDNA) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

    const tripPlan = tripEngine.generateItinerary(destination, days, travelDNA, budget);

    // Add metadata
    const fullTripPlan = {
      id: Date.now(),
      userId,
      ...tripPlan,
      startDate,
      endDate,
      budget,
      travelers,
      createdAt: new Date().toISOString()
    };
    // Store trip plan
    tripPlans.set(fullTripPlan.id, fullTripPlan);
    res.json(fullTripPlan);

  } catch (error) {
    console.error('Error generating trip plan:', error);
    res.status(500).json({ error: 'Failed to generate trip plan' });
  }
});

// Save Travel DNA
app.post('/api/travel-dna', verifyToken, (req, res) => {
  try {
    const { userId, travelDNA } = req.body;

    const profile = {
      userId,
      ...travelDNA,
      updatedAt: new Date().toISOString()
    };
    travelDNAProfiles.set(userId, profile);

    res.json({ success: true, profile });
  } catch (error) {
    console.error('Error saving Travel DNA:', error);
    res.status(500).json({ error: 'Failed to save Travel DNA' });
  }
});

// Get Travel DNA
app.get('/api/travel-dna/:userId', verifyToken, (req, res) => {
  try {
    const { userId } = req.params;
    const profile = travelDNAProfiles.get(userId);

    if (!profile) {
      return res.status(404).json({ error: 'Travel DNA profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error getting Travel DNA:', error);
    res.status(500).json({ error: 'Failed to get Travel DNA' });
  }
});

// Save trip plan
app.post('/api/trip-plans', verifyToken, (req, res) => {
  try {
    const tripPlan = req.body;
    tripPlan.savedAt = new Date().toISOString();

    tripPlans.set(tripPlan.id, tripPlan);

    res.json({ success: true, tripPlan });
  } catch (error) {
    console.error('Error saving trip plan:', error);
    res.status(500).json({ error: 'Failed to save trip plan' });
  }
});

// Get user's trip plans
app.get('/api/trip-plans/:userId', verifyToken, (req, res) => {
  try {
    const { userId } = req.params;
    const userTripPlans = Array.from(tripPlans.values())
      .filter(plan => plan.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(userTripPlans);
  } catch (error) {
    console.error('Error getting trip plans:', error);
    res.status(500).json({ error: 'Failed to get trip plans' });
  }
});

// Update activity feedback
app.post('/api/activity-feedback', verifyToken, (req, res) => {
  try {
    const { tripPlanId, activityId, feedback } = req.body;

    const feedbackKey = `${tripPlanId}-${activityId}`;
    const feedbackData = {
      tripPlanId,
      activityId,
      feedback, // 'done', 'skipped', 'liked', 'disliked'
      timestamp: new Date().toISOString(),
      userId: req.user.id
    };
    activityFeedback.set(feedbackKey, feedbackData);

    // Update Travel DNA based on feedback (learning algorithm)
    updateTravelDNAFromFeedback(req.user.id, feedback, activityId);

    res.json({ success: true, feedback: feedbackData });
  } catch (error) {
    console.error('Error updating activity feedback:', error);
    res.status(500).json({ error: 'Failed to update activity feedback' });
  }
});

// Learning algorithm to update Travel DNA based on user feedback
function updateTravelDNAFromFeedback(userId, feedback, activityId) {
  const profile = travelDNAProfiles.get(userId);
  if (!profile) return;
  // Extract activity type from activity ID or content
  // This is a simplified version - in production, you'd have more sophisticated analysis
  const adjustmentFactor = 0.05; // Small incremental changes
  if (feedback === 'liked' || feedback === 'done') {
    // Positive feedback - slightly increase preference
    // You would analyze the activity type and adjust accordingly
    // This is a placeholder for the learning algorithm
  } else if (feedback === 'disliked' || feedback === 'skipped') {
    // Negative feedback - slightly decrease preference
    // Adjust the relevant DNA traits
  }
  // Save updated profile
  profile.updatedAt = new Date().toISOString();
  travelDNAProfiles.set(userId, profile);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Trip Planning API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;