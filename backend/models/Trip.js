// models/Trip.js
import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  activity: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  cost: { type: Number, required: true },
  type: {
    type: String,
    enum: ['adventure', 'culture', 'foodie', 'relaxation'],
    required: true
  },
  duration: { type: String, required: true },
  time: { type: String },
  status: {
    type: String,
    enum: ['active', 'done', 'skipped'],
    default: 'active'
  },
  alternativesRequested: { type: Number, default: 0 },
  completedAt: { type: Date },
  skippedAt: { type: Date },

  // Enrichment fields per place/activity
  placeId: { type: String },
  rating: { type: Number },          // 1..5 rating from Google Places (if available)
  ratingCount: { type: Number },     // number of ratings
  map: {
    mapsUrl: { type: String },       // Google Maps search URL
    staticMapUrl: { type: String },  // Google Static Maps preview (requires API key)
    placeUrl: { type: String }       // Direct Google Maps Place URL if placeId available
  },
  crowd: {
    level: { type: String, enum: ['Low', 'Medium', 'High'] },
    reasons: [String]
  },
  events: [{
    name: String,
    startDate: String,  // YYYY-MM-DD
    endDate: String,    // YYYY-MM-DD
    url: String,
    distanceKm: Number
  }]
});

const mealSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true
  },
  restaurant: { type: String, required: true },
  cuisine: { type: String, required: true },
  cost: { type: Number, required: true },
  location: { type: String, required: true },
  status: {
    type: String,
    enum: ['active', 'done', 'skipped'],
    default: 'active'
  }
});

const accommodationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  cost: { type: Number, required: true },
  location: { type: String, required: true }
});

const dailyItinerarySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  theme: { type: String, required: true },
  activities: [activitySchema],
  meals: [mealSchema],
  accommodation: accommodationSchema,

  // ✅ Weather forecast attached per day
  weather: {
    date: { type: String },                // YYYY-MM-DD (destination local date)
    summary: { type: String },             // e.g., "Light rain"
    icon: { type: String },                // e.g., 'clear', 'rain', etc. from Open-Meteo mapping
    tempMinC: { type: Number },            // min temperature in °C
    tempMaxC: { type: Number },            // max temperature in °C
    precipitationChance: { type: Number }, // 0..1 probability
    humidity: { type: Number },
    windKph: { type: Number },
    provider: { type: String },            // 'open-meteo'
    timezone: { type: String }
  }
});

const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  destination: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  travelers: {
    type: Number,
    required: true,
    min: 1
  },
  accommodation: {
    type: String,
    required: true
  },
  transportation: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['planned', 'ongoing', 'completed', 'cancelled'],
    default: 'planned'
  },
  itinerary: {
    destination: String,
    totalDays: Number,
    estimatedTotalCost: Number,
    costBreakdown: {
      accommodation: Number,
      food: Number,
      activities: Number,
      transportation: Number,
      miscellaneous: Number
    },
    dailyItinerary: [dailyItinerarySchema],
    recommendations: {
      bestTimeToVisit: String,
      localTips: [String],
      packingList: [String],
      culturalEtiquette: [String]
    }
  },
  travelDNA: {
    adventure: { type: Number, required: true },
    culture: { type: Number, required: true },
    foodie: { type: Number, required: true },
    budget: { type: Number, required: true },
    pace: { type: String, required: true }
  },
  totalActivities: {
    type: Number,
    default: 0
  },
  completedActivities: {
    type: Number,
    default: 0
  },
  skippedActivities: {
    type: Number,
    default: 0
  },
  alternativesRequested: {
    type: Number,
    default: 0
  },
  generatedBy: {
    type: String,
    enum: ['ai', 'mock'],
    default: 'ai'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
});

// Indexes for efficient queries
tripSchema.index({ userId: 1, status: 1 });
tripSchema.index({ userId: 1, createdAt: -1 });
tripSchema.index({ destination: 1 });

// Calculate total activities when itinerary is saved
tripSchema.pre('save', function (next) {
  if (this.itinerary && this.itinerary.dailyItinerary) {
    let totalActivities = 0;
    this.itinerary.dailyItinerary.forEach(day => {
      if (day.activities) {
        totalActivities += day.activities.length;
      }
    });
    this.totalActivities = totalActivities;
  }
  next();
});

// Methods to update activity status
tripSchema.methods.markActivityDone = function (dayIndex, activityIndex) {
  if (
    this.itinerary.dailyItinerary[dayIndex] &&
    this.itinerary.dailyItinerary[dayIndex].activities[activityIndex]
  ) {
    const activity = this.itinerary.dailyItinerary[dayIndex].activities[activityIndex];
    if (activity.status === 'active') {
      activity.status = 'done';
      activity.completedAt = new Date();
      this.completedActivities += 1;
    }
  }
  return this.save();
};

tripSchema.methods.markActivitySkipped = function (dayIndex, activityIndex) {
  if (
    this.itinerary.dailyItinerary[dayIndex] &&
    this.itinerary.dailyItinerary[dayIndex].activities[activityIndex]
  ) {
    const activity = this.itinerary.dailyItinerary[dayIndex].activities[activityIndex];
    if (activity.status === 'active') {
      activity.status = 'skipped';
      activity.skippedAt = new Date();
      this.skippedActivities += 1;
    }
  }
  return this.save();
};

tripSchema.methods.requestAlternative = function (dayIndex, activityIndex) {
  if (
    this.itinerary.dailyItinerary[dayIndex] &&
    this.itinerary.dailyItinerary[dayIndex].activities[activityIndex]
  ) {
    const activity = this.itinerary.dailyItinerary[dayIndex].activities[activityIndex];
    activity.alternativesRequested += 1;
    this.alternativesRequested += 1;
  }
  return this.save();
};

tripSchema.methods.checkCompletion = function () {
  const allActivitiesProcessed =
    this.completedActivities + this.skippedActivities >= this.totalActivities;
  if (allActivitiesProcessed && this.status === 'ongoing') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  return allActivitiesProcessed;
};

// Unique index to prevent duplicate trips for same user + destination + date range
tripSchema.index(
  { userId: 1, destination: 1, startDate: 1, endDate: 1 },
  { unique: true }
);

const Trip = mongoose.model('Trip', tripSchema);

export default Trip;
