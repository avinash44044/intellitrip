import mongoose from 'mongoose';

const itineraryCacheSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  cacheKey: {
    type: String,
    required: true,
    index: true
  },
  destination: {
    type: String,
    required: true,
    trim: true
  },
  travelDNA: {
    adventure: { type: Number, required: true },
    culture: { type: Number, required: true },
    foodie: { type: Number, required: true },
    budget: { type: Number, required: true },
    pace: { type: String, required: true }
  },
  tripParams: {
    accommodation: { type: String, required: true },
    transportation: { type: String, required: true },
    travelers: { type: Number, required: true },
    duration: { type: Number, required: true }
  },
  itinerary: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  generatedBy: {
    type: String,
    enum: ['ai', 'mock'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800 // 7 days in seconds (7 * 24 * 60 * 60)
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  accessCount: {
    type: Number,
    default: 1
  }
});

// Compound index for efficient lookups
itineraryCacheSchema.index({ userId: 1, cacheKey: 1 }, { unique: true });
itineraryCacheSchema.index({ userId: 1, destination: 1 });
itineraryCacheSchema.index({ createdAt: 1 }); // For TTL

// Update lastAccessed when accessed
itineraryCacheSchema.methods.markAccessed = function() {
  this.lastAccessed = new Date();
  this.accessCount += 1;
  return this.save();
};

const ItineraryCache = mongoose.model('ItineraryCache', itineraryCacheSchema);

export default ItineraryCache;