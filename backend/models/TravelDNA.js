import mongoose from 'mongoose';

const activityPreferencesSchema = new mongoose.Schema({
  completed: {
    adventure: { type: Number, default: 0 },
    culture: { type: Number, default: 0 },
    foodie: { type: Number, default: 0 },
    relaxation: { type: Number, default: 0 }
  },
  skipped: {
    adventure: { type: Number, default: 0 },
    culture: { type: Number, default: 0 },
    foodie: { type: Number, default: 0 },
    relaxation: { type: Number, default: 0 }
  },
  alternativesRequested: {
    adventure: { type: Number, default: 0 },
    culture: { type: Number, default: 0 },
    foodie: { type: Number, default: 0 },
    relaxation: { type: Number, default: 0 }
  }
});

const tripStatsSchema = new mongoose.Schema({
  totalTrips: { type: Number, default: 0 },
  completedTrips: { type: Number, default: 0 },
  ongoingTrips: { type: Number, default: 0 },
  plannedTrips: { type: Number, default: 0 },
  totalActivitiesCompleted: { type: Number, default: 0 },
  totalActivitiesSkipped: { type: Number, default: 0 },
  totalAlternativesRequested: { type: Number, default: 0 }
});

const travelDNASchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  // Initial DNA scores (from quiz)
  initialDNA: {
    adventure: { type: Number, required: true, min: 0, max: 1 },
    culture: { type: Number, required: true, min: 0, max: 1 },
    foodie: { type: Number, required: true, min: 0, max: 1 },
    budget: { 
      type: String, 
      enum: ['budget', 'mid-range', 'luxury'],
      required: true 
    },
    pace: { 
      type: String, 
      enum: ['slow', 'moderate', 'fast'],
      required: true 
    }
  },
  // Current evolved DNA scores (0-10 scale for display)
  adventureScore: { type: Number, default: 5, min: 0, max: 10 },
  cultureScore: { type: Number, default: 5, min: 0, max: 10 },
  foodieScore: { type: Number, default: 5, min: 0, max: 10 },
  relaxationScore: { type: Number, default: 5, min: 0, max: 10 },
  
  // Activity preferences based on user actions
  activityPreferences: {
    type: activityPreferencesSchema,
    default: () => ({})
  },
  
  // Trip statistics
  tripStats: {
    type: tripStatsSchema,
    default: () => ({})
  },
  
  // Personality insights
  personalityInsights: {
    dominantTrait: { 
      type: String, 
      enum: ['adventure', 'culture', 'foodie', 'relaxation'],
      default: 'adventure'
    },
    travelStyle: {
      type: String,
      enum: ['explorer', 'cultural_immersion', 'foodie_adventure', 'relaxation_seeker', 'balanced_traveler'],
      default: 'balanced_traveler'
    },
    profileTitle: {
      type: String,
      default: 'Balanced Traveler'
    },
    recommendedDestinations: [String],
    preferredActivities: [String]
  },
  
  // Evolution tracking
  evolutionHistory: [{
    date: { type: Date, default: Date.now },
    action: { 
      type: String, 
      enum: ['activity_completed', 'activity_skipped', 'alternative_requested', 'trip_completed'],
      required: true 
    },
    activityType: { 
      type: String, 
      enum: ['adventure', 'culture', 'foodie', 'relaxation']
    },
    scoreChanges: {
      adventure: Number,
      culture: Number,
      foodie: Number,
      relaxation: Number
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip'
    }
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
travelDNASchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods for DNA evolution
travelDNASchema.methods.evolveFromActivity = function(activityType, action) {
  const evolutionFactor = 0.1; // How much each action affects the score
  let scoreChange = 0;
  
  switch (action) {
    case 'completed':
      scoreChange = evolutionFactor;
      this.activityPreferences.completed[activityType] += 1;
      this.tripStats.totalActivitiesCompleted += 1;
      break;
    case 'skipped':
      scoreChange = -evolutionFactor;
      this.activityPreferences.skipped[activityType] += 1;
      this.tripStats.totalActivitiesSkipped += 1;
      break;
    case 'alternative_requested':
      scoreChange = -evolutionFactor * 0.5; // Less penalty for requesting alternatives
      this.activityPreferences.alternativesRequested[activityType] += 1;
      this.tripStats.totalAlternativesRequested += 1;
      break;
  }
  
  // Update the specific score
  const scoreField = activityType === 'adventure' ? 'adventureScore' :
                    activityType === 'culture' ? 'cultureScore' :
                    activityType === 'foodie' ? 'foodieScore' : 'relaxationScore';
  
  this[scoreField] = Math.max(0, Math.min(10, this[scoreField] + scoreChange));
  
  // Record evolution history
  const evolutionEntry = {
    action: action === 'completed' ? 'activity_completed' : 
            action === 'skipped' ? 'activity_skipped' : 'alternative_requested',
    activityType,
    scoreChanges: {
      adventure: activityType === 'adventure' ? scoreChange : 0,
      culture: activityType === 'culture' ? scoreChange : 0,
      foodie: activityType === 'foodie' ? scoreChange : 0,
      relaxation: activityType === 'relaxation' ? scoreChange : 0
    }
  };
  
  this.evolutionHistory.push(evolutionEntry);
  
  // Update personality insights
  this.updatePersonalityInsights();
  
  return this.save();
};

travelDNASchema.methods.updatePersonalityInsights = function() {
  // Determine dominant trait
  const scores = {
    adventure: this.adventureScore,
    culture: this.cultureScore,
    foodie: this.foodieScore,
    relaxation: this.relaxationScore
  };

  // Compute dominant and second-highest to decide balance
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topTrait, topScore] = sorted[0];
  const [, secondScore] = sorted[1];

  this.personalityInsights.dominantTrait = topTrait;

  // Balanced if scores are close
  const isBalanced = (topScore - secondScore) < 1.0;

  // Map dominant trait to travel style
  const styleByTrait = {
    adventure: 'explorer',
    culture: 'cultural_immersion',
    foodie: 'foodie_adventure',
    relaxation: 'relaxation_seeker'
  };

  this.personalityInsights.travelStyle = isBalanced
    ? 'balanced_traveler'
    : styleByTrait[topTrait] || 'balanced_traveler';

  // Friendly profile title for UI
  const titleByTrait = {
    adventure: 'Adventure-Driven Traveler (Explorer)',
    culture: 'Culture-Focused Traveler (Cultural Immersion)',
    foodie: 'Culinary Explorer (Foodie Adventure)',
    relaxation: 'Relaxation Seeker'
  };
  this.personalityInsights.profileTitle = isBalanced
    ? 'Balanced Traveler'
    : (titleByTrait[topTrait] || 'Balanced Traveler');
};

travelDNASchema.methods.updateTripStats = function(tripStatus) {
  switch (tripStatus) {
    case 'planned':
      this.tripStats.totalTrips += 1;
      this.tripStats.plannedTrips += 1;
      break;
    case 'ongoing':
      this.tripStats.plannedTrips -= 1;
      this.tripStats.ongoingTrips += 1;
      break;
    case 'completed':
      this.tripStats.ongoingTrips -= 1;
      this.tripStats.completedTrips += 1;
      break;
  }
  return this.save();
};

// Initialize DNA from quiz results
travelDNASchema.statics.createFromQuiz = async function(userId, quizResults) {
  // Map relaxation from quiz pace directly to avoid coupling it to adventure
  const relaxationFromPace = (pace) => {
    switch (pace) {
      case 'slow': return 0.9;       // more downtime
      case 'moderate': return 0.6;  // balanced
      case 'fast': return 0.3;      // less downtime
      default: return 0.6;
    }
  };

  const initialScores = {
    adventure: quizResults.adventure * 10,
    culture: quizResults.culture * 10,
    foodie: quizResults.foodie * 10,
    relaxation: relaxationFromPace(quizResults.pace) * 10
  };

  const doc = await this.create({
    userId,
    initialDNA: quizResults,
    adventureScore: initialScores.adventure,
    cultureScore: initialScores.culture,
    foodieScore: initialScores.foodie,
    relaxationScore: initialScores.relaxation
  });

  // Compute insights immediately so profileTitle/travelStyle are set
  doc.updatePersonalityInsights();
  await doc.save();
  return doc;
};

const TravelDNA = mongoose.model('TravelDNA', travelDNASchema);

export default TravelDNA;
