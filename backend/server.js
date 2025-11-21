import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import ItineraryCache from './models/ItineraryCache.js';
import Trip from './models/Trip.js';
import TravelDNA from './models/TravelDNA.js';
import { getForecastForTrip, attachWeatherToItinerary } from './services/weatherService.js';
import { enrichItinerary } from './services/enrichmentService.js';

function normalizeDate(str) {
  if (!str) return null;
  const [y, m, d] = str.includes('/') ? str.split('/') : str.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d));
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/intellitrip';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email, passwordLength: password?.length });

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('User found:', { id: user._id, email: user.email });

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Password invalid for user:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('Login successful for:', email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Debug endpoints (remove in production)
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // Exclude passwords
    res.json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/debug/create-test-user', async (req, res) => {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      return res.json({ message: 'Test user already exists', email: 'test@example.com', password: 'test123' });
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('test123', 10);
    const testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword
    });

    await testUser.save();
    res.json({ 
      message: 'Test user created successfully', 
      email: 'test@example.com', 
      password: 'test123',
      note: 'Use these credentials to login'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected route middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Protected route example
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Travel DNA Routes

// Create or update Travel DNA from quiz
app.post('/api/travel-dna/create', authenticateToken, async (req, res) => {
  try {
    // Handle both formats: direct data or wrapped in quizResults
    const quizResults = req.body.quizResults || req.body;
    const userId = req.user.userId;

    console.log('Creating Travel DNA for user:', userId);
    console.log('Quiz results:', quizResults);

    // Check if DNA already exists
    let travelDNA = await TravelDNA.findOne({ userId });
    
    if (travelDNA) {
      // Update existing DNA
      travelDNA.initialDNA = quizResults;
      travelDNA.adventureScore = quizResults.adventure * 10;
      travelDNA.cultureScore = quizResults.culture * 10;
      travelDNA.foodieScore = quizResults.foodie * 10;
      // Derive relaxation from pace rather than inverse of adventure
      const relaxationFromPace = (pace) => {
        switch (pace) {
          case 'slow': return 0.9;
          case 'moderate': return 0.6;
          case 'fast': return 0.3;
          default: return 0.6;
        }
      };
      travelDNA.relaxationScore = relaxationFromPace(quizResults.pace) * 10;
      travelDNA.updatePersonalityInsights();
      await travelDNA.save();
      console.log('Updated existing Travel DNA');
    } else {
      // Create new DNA
      travelDNA = await TravelDNA.createFromQuiz(userId, quizResults);
      console.log('Created new Travel DNA');
    }

    res.json({
      message: 'Travel DNA created/updated successfully',
      travelDNA
    });
  } catch (error) {
    console.error('Travel DNA creation error:', error);
    res.status(500).json({ message: 'Server error creating Travel DNA' });
  }
});

// Get Travel DNA profile
app.get('/api/travel-dna/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const travelDNA = await TravelDNA.findOne({ userId });

    if (!travelDNA) {
      return res.status(404).json({ message: 'Travel DNA not found' });
    }

    res.json({ travelDNA });
  } catch (error) {
    console.error('Travel DNA fetch error:', error);
    res.status(500).json({ message: 'Server error fetching Travel DNA' });
  }
});

// Update Travel DNA from activity interaction
app.post('/api/travel-dna/evolve', authenticateToken, async (req, res) => {
  try {
    const { activityType, action, tripId } = req.body;
    const userId = req.user.userId;

    const travelDNA = await TravelDNA.findOne({ userId });
    if (!travelDNA) {
      return res.status(404).json({ message: 'Travel DNA not found' });
    }

    await travelDNA.evolveFromActivity(activityType, action);

    // Add tripId to evolution history if provided
    if (tripId && travelDNA.evolutionHistory.length > 0) {
      travelDNA.evolutionHistory[travelDNA.evolutionHistory.length - 1].tripId = tripId;
      await travelDNA.save();
    }

    res.json({
      message: 'Travel DNA evolved successfully',
      travelDNA
    });
  } catch (error) {
    console.error('Travel DNA evolution error:', error);
    res.status(500).json({ message: 'Server error evolving Travel DNA' });
  }
});

// Trip Management Routes

// Create a new trip (FIXED userId handling)
// Create a new trip
app.post('/api/trips/create', authenticateToken, async (req, res) => {
  try {
    const {
      destination,
      startDate,
      endDate,
      itinerary,
      userId: _ignoredUserId,      // ignore any client-sent userId
      userEmail: _ignoredUserEmail, // ignore any client-sent userEmail
      ...restOfBody
    } = req.body;

    const userId = req.user.userId;
    const userEmail = req.user.email;

    // --- 1) Normalize the REAL trip dates (from the form) ---
    const normStart = normalizeDate(startDate);
    const normEnd = normalizeDate(endDate);

    if (!normStart || !normEnd) {
      console.error('[TRIPS] Invalid start/end date received:', startDate, endDate);
      return res.status(400).json({ message: 'Invalid trip dates' });
    }

    console.log('Body destination/start/end:', { destination, startDate, endDate });

    let finalItinerary = itinerary;

    // --- 2) Rebase all dailyItinerary.date to match real trip dates ---
    if (finalItinerary?.dailyItinerary?.length) {
      const base = new Date(normStart);
      finalItinerary = {
        ...finalItinerary,
        dailyItinerary: finalItinerary.dailyItinerary.map((day, idx) => {
          const d = new Date(base);
          d.setDate(base.getDate() + idx);
          const iso = d.toISOString().slice(0, 10); // YYYY-MM-DD

          return {
            ...day,
            date: iso, // overwrite old template date (e.g. 2023-10-27) with real date
          };
        })
      };

      console.log(
        '[TRIPS] Rebased dailyItinerary dates:',
        finalItinerary.dailyItinerary.map(d => d.date)
      );
    }

    // --- 3) Fetch forecast using REAL trip dates, not template dates ---
    if (destination && finalItinerary?.dailyItinerary?.length) {
      console.log(`[SERVER] Starting weather and enrichment for ${destination}...`);

      const forecast = await getForecastForTrip({
        destination,
        startDate: normStart, // pass real dates as Date objects
        endDate: normEnd,
      });

      finalItinerary = attachWeatherToItinerary(finalItinerary, forecast);

      console.log(
        '[SERVER] Weather data attached. First day weather:',
        finalItinerary.dailyItinerary?.[0]?.weather || null
      );

      // Enrichment AFTER weather
      finalItinerary = await enrichItinerary(finalItinerary, destination);
      console.log('[SERVER] Enrichment successful.');
    }

    // --- 4) Deduplicate by user + destination + REAL date range ---
    const existingTrip = await Trip.findOne({
      userId,
      destination,
      startDate: normStart,
      endDate: normEnd
    });

    if (existingTrip) {
      return res.json({
        message: 'Trip already exists (deduplicated)',
        trip: existingTrip,
        deduplicated: true
      });
    }

    // --- 5) Save trip with rebased dates + weather ---
    const newTrip = new Trip({
      ...restOfBody,        // budget, travelers, etc.
      userId,               // from JWT
      userEmail,            // optional
      destination,
      startDate: normStart,
      endDate: normEnd,
      itinerary: finalItinerary
    });

    await newTrip.save();
    console.log('[SERVER] Trip saved to database successfully.');
    res.status(201).json({ message: 'Trip created successfully', trip: newTrip });

  } catch (error) {
    console.error('--- TRIP CREATION FAILED ---');
    console.error('The error occurred during weather/enrichment or saving:', error);
    res.status(500).json({ message: 'Server error during trip creation', error: error.message });
  }
});



// Get user's trips
app.get('/api/trips/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const trips = await Trip.find({ userId }).sort({ createdAt: -1 });

    res.json({ trips });
  } catch (error) {
    console.error('Trip history fetch error:', error);
    res.status(500).json({ message: 'Server error fetching trips' });
  }
});

// Get preplanned itineraries aggregated from all users (anonymized)
app.get('/api/preplanned-itineraries', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const destination = req.query.destination;

    const query = {};
    if (destination) {
      query.destination = destination;
    }

    // Project only safe fields, exclude PII
    const trips = await Trip.find(query, {
      destination: 1,
      startDate: 1,
      endDate: 1,
      budget: 1,
      travelers: 1,
      accommodation: 1,
      transportation: 1,
      itinerary: 1,
      generatedBy: 1,
      createdAt: 1
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

    res.json({ itineraries: trips });
  } catch (error) {
    console.error('Preplanned itineraries fetch error:', error);
    res.status(500).json({ message: 'Server error fetching preplanned itineraries' });
  }
});

// Clone a preplanned itinerary into the current user's trips (supports custom dates)
app.post('/api/preplanned-itineraries/:tripId/clone', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;

    const source = await Trip.findById(tripId);
    if (!source) {
      return res.status(404).json({ message: 'Source itinerary not found' });
    }

    // If custom dates are provided, rebase itinerary dates accordingly
    let { startDate, endDate } = req.body || {};
    const totalDays = source?.itinerary?.totalDays || 0;
    const normalizeDateLocal = (d) => {
      if (!d) return null;
      const nd = new Date(d);
      return isNaN(nd) ? null : nd;
    };
    const sCustom = normalizeDateLocal(startDate);
    const eCustom = normalizeDateLocal(endDate);

    // If only startDate provided, compute endDate from totalDays
    let finalStart = sCustom || source.startDate;
    let finalEnd = eCustom || source.endDate;
    if (sCustom && !eCustom && totalDays > 0) {
      const e = new Date(sCustom);
      e.setDate(e.getDate() + Math.max(0, totalDays - 1));
      finalEnd = e;
    }

    // Rebase dailyItinerary dates if custom dates used
    let finalItinerary = source.itinerary;
    if (sCustom) {
      try {
        const base = new Date(finalStart);
        finalItinerary = { ...source.itinerary };
        finalItinerary.dailyItinerary = (source.itinerary?.dailyItinerary || []).map((day, idx) => {
          const d = new Date(base);
          d.setDate(base.getDate() + idx);
          return { ...day, date: d.toISOString().slice(0, 10) };
        });
      } catch (e) {
        console.warn('Failed to rebase itinerary dates, using source dates.');
        finalItinerary = source.itinerary;
      }
    }

    // Create a new trip for current user, copying itinerary/details
    const clone = new Trip({
      userId,
      destination: source.destination,
      startDate: finalStart,
      endDate: finalEnd,
      budget: source.budget,
      travelers: source.travelers,
      accommodation: source.accommodation,
      transportation: source.transportation,
      itinerary: finalItinerary,
      travelDNA: source.travelDNA,
      generatedBy: 'ai'
    });

    await clone.save();
    res.json({ message: 'Itinerary added to your trips', trip: clone });
  } catch (error) {
    console.error('Clone itinerary error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A similar trip already exists for your account' });
    }
    res.status(500).json({ message: 'Server error cloning itinerary' });
  }
});

// Get specific trip details
app.get('/api/trips/:tripId', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;

    const trip = await Trip.findOne({ _id: tripId, userId });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    res.json({ trip });
  } catch (error) {
    console.error('Trip fetch error:', error);
    res.status(500).json({ message: 'Server error fetching trip' });
  }
});

// Update trip status
app.put('/api/trips/:tripId/status', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const trip = await Trip.findOne({ _id: tripId, userId });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const oldStatus = trip.status;
    trip.status = status;

    if (status === 'ongoing' && !trip.startedAt) {
      trip.startedAt = new Date();
    }

    if (status === 'completed' && !trip.completedAt) {
      trip.completedAt = new Date();
    }

    await trip.save();

    // Update Travel DNA trip stats
    const userDNA = await TravelDNA.findOne({ userId });
    if (userDNA) {
      await userDNA.updateTripStats(status);
    }

    res.json({
      message: 'Trip status updated successfully',
      trip
    });
  } catch (error) {
    console.error('Trip status update error:', error);
    res.status(500).json({ message: 'Server error updating trip status' });
  }
});

// Activity interaction routes
app.post('/api/trips/:tripId/activity/:dayIndex/:activityIndex/done', authenticateToken, async (req, res) => {
  try {
    const { tripId, dayIndex, activityIndex } = req.params;
    const userId = req.user.userId;

    const trip = await Trip.findOne({ _id: tripId, userId });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    await trip.markActivityDone(parseInt(dayIndex), parseInt(activityIndex));
    
    // Get activity type for DNA evolution
    const activity = trip.itinerary.dailyItinerary[dayIndex].activities[activityIndex];
    if (activity) {
      const userDNA = await TravelDNA.findOne({ userId });
      if (userDNA) {
        await userDNA.evolveFromActivity(activity.type, 'completed');
      }
    }

    // Check if trip is completed
    const isCompleted = trip.checkCompletion();
    if (isCompleted) {
      await trip.save();
      
      // Update DNA trip stats
      const userDNA = await TravelDNA.findOne({ userId });
      if (userDNA) {
        await userDNA.updateTripStats('completed');
      }
    }

    res.json({
      message: 'Activity marked as done',
      trip,
      tripCompleted: isCompleted
    });
  } catch (error) {
    console.error('Activity done error:', error);
    res.status(500).json({ message: 'Server error marking activity as done' });
  }
});

app.post('/api/trips/:tripId/activity/:dayIndex/:activityIndex/skip', authenticateToken, async (req, res) => {
  try {
    const { tripId, dayIndex, activityIndex } = req.params;
    const userId = req.user.userId;

    const trip = await Trip.findOne({ _id: tripId, userId });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    await trip.markActivitySkipped(parseInt(dayIndex), parseInt(activityIndex));
    
    // Get activity type for DNA evolution
    const activity = trip.itinerary.dailyItinerary[dayIndex].activities[activityIndex];
    if (activity) {
      const userDNA = await TravelDNA.findOne({ userId });
      if (userDNA) {
        await userDNA.evolveFromActivity(activity.type, 'skipped');
      }
    }

    // Check if trip is completed
    const isCompleted = trip.checkCompletion();
    if (isCompleted) {
      await trip.save();
      
      // Update DNA trip stats
      const userDNA = await TravelDNA.findOne({ userId });
      if (userDNA) {
        await userDNA.updateTripStats('completed');
      }
    }

    res.json({
      message: 'Activity skipped',
      trip,
      tripCompleted: isCompleted
    });
  } catch (error) {
    console.error('Activity skip error:', error);
    res.status(500).json({ message: 'Server error skipping activity' });
  }
});

app.post('/api/trips/:tripId/activity/:dayIndex/:activityIndex/alternative', authenticateToken, async (req, res) => {
  try {
    const { tripId, dayIndex, activityIndex } = req.params;
    const userId = req.user.userId;

    const trip = await Trip.findOne({ _id: tripId, userId });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    await trip.requestAlternative(parseInt(dayIndex), parseInt(activityIndex));
    
    // Get activity type for DNA evolution
    const activity = trip.itinerary.dailyItinerary[dayIndex].activities[activityIndex];
    if (activity) {
      const userDNA = await TravelDNA.findOne({ userId });
      if (userDNA) {
        await userDNA.evolveFromActivity(activity.type, 'alternative_requested');
      }
    }

    // Generate alternative activity (mock for now)
    // Encourage variation by sometimes suggesting a different category
    const categories = ['adventure','culture','foodie','relaxation'];
    const otherCategories = categories.filter(c => c !== activity.type);
    const suggestedType = otherCategories[Math.floor(Math.random() * otherCategories.length)];

    const alternativeActivity = {
      activity: `Alternative ${suggestedType} activity`,
      location: activity.location,
      description: `An alternative ${suggestedType} experience in the same area`,
      cost: Math.max(0, Math.round(activity.cost * 0.9)),
      type: suggestedType,
      duration: activity.duration,
      time: activity.time,
      dayIndex: parseInt(dayIndex),
      activityIndex: parseInt(activityIndex)
    };

    res.json({
      message: 'Alternative requested',
      trip,
      alternativeActivity
    });
  } catch (error) {
    console.error('Alternative request error:', error);
    res.status(500).json({ message: 'Server error requesting alternative' });
  }
});

// Accept an alternative activity and evolve DNA for the new category
app.post('/api/trips/:tripId/activity/:dayIndex/:activityIndex/alternative/accept', authenticateToken, async (req, res) => {
  try {
    const { tripId, dayIndex, activityIndex } = req.params;
    const { alternative } = req.body; // expected fields: activity, location, description, cost, type, duration, time
    const userId = req.user.userId;

    if (!alternative || !alternative.type) {
      return res.status(400).json({ message: 'Alternative with valid type is required' });
    }

    const trip = await Trip.findOne({ _id: tripId, userId });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const dIdx = parseInt(dayIndex);
    const aIdx = parseInt(activityIndex);

    const currentActivity = trip.itinerary?.dailyItinerary?.[dIdx]?.activities?.[aIdx];
    if (!currentActivity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    // Replace the activity with the accepted alternative
    trip.itinerary.dailyItinerary[dIdx].activities[aIdx] = {
      activity: alternative.activity || currentActivity.activity,
      location: alternative.location || currentActivity.location,
      description: alternative.description || currentActivity.description,
      cost: typeof alternative.cost === 'number' ? alternative.cost : currentActivity.cost,
      type: alternative.type,
      duration: alternative.duration || currentActivity.duration,
      time: alternative.time || currentActivity.time,
      status: 'active',
      alternativesRequested: (currentActivity.alternativesRequested || 0)
    };

    await trip.save();

    // Evolve DNA in favor of the new category to encourage variation
    const userDNA = await TravelDNA.findOne({ userId });
    if (userDNA) {
      await userDNA.evolveFromActivity(alternative.type, 'completed');
    }

    res.json({
      message: 'Alternative accepted and activity updated',
      trip
    });
  } catch (error) {
    console.error('Alternative accept error:', error);
    res.status(500).json({ message: 'Server error accepting alternative' });
  }
});

// Itinerary Cache Routes

// Check for cached itinerary
app.post('/api/itinerary/check-cache', authenticateToken, async (req, res) => {
  try {
    const { destination, travelDNA, tripParams } = req.body;
    const userId = req.user.userId;

    // Generate cache key (same logic as frontend)
    const cacheKey = `${destination.toLowerCase().replace(/\s+/g, '_')}_${travelDNA.adventure}_${travelDNA.culture}_${travelDNA.foodie}_${travelDNA.budget}_${travelDNA.pace}_${tripParams.accommodation}_${tripParams.transportation}_${tripParams.travelers}_${tripParams.duration}`;

    console.log('Checking cache for key:', cacheKey);

    // Look for cached itinerary
    const cachedItinerary = await ItineraryCache.findOne({
      userId,
      cacheKey
    });

    if (cachedItinerary) {
      // Update access tracking
      await cachedItinerary.markAccessed();
      
      console.log('Cache hit for user:', userId, 'destination:', destination);
      
      res.json({
        cached: true,
        itinerary: cachedItinerary.itinerary,
        generatedBy: cachedItinerary.generatedBy,
        createdAt: cachedItinerary.createdAt,
        accessCount: cachedItinerary.accessCount
      });
    } else {
      console.log('Cache miss for user:', userId, 'destination:', destination);
      res.json({ cached: false });
    }
  } catch (error) {
    console.error('Cache check error:', error);
    res.status(500).json({ message: 'Server error checking cache' });
  }
});

// Store itinerary in cache
app.post('/api/itinerary/cache', authenticateToken, async (req, res) => {
  try {
    const { destination, travelDNA, tripParams, itinerary, generatedBy } = req.body;
    const userId = req.user.userId;

    // Generate cache key
    const cacheKey = `${destination.toLowerCase().replace(/\s+/g, '_')}_${travelDNA.adventure}_${travelDNA.culture}_${travelDNA.foodie}_${travelDNA.budget}_${travelDNA.pace}_${tripParams.accommodation}_${tripParams.transportation}_${tripParams.travelers}_${tripParams.duration}`;

    console.log('Caching itinerary for key:', cacheKey);

    // Create or update cache entry
    const cacheEntry = await ItineraryCache.findOneAndUpdate(
      { userId, cacheKey },
      {
        destination,
        travelDNA,
        tripParams,
        itinerary,
        generatedBy,
        lastAccessed: new Date(),
        $inc: { accessCount: 1 }
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log('Itinerary cached successfully for user:', userId);

    res.json({
      message: 'Itinerary cached successfully',
      cacheId: cacheEntry._id
    });
  } catch (error) {
    console.error('Cache store error:', error);
    res.status(500).json({ message: 'Server error storing cache' });
  }
});

// Get user's cached destinations
app.get('/api/itinerary/cache-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const cacheStats = await ItineraryCache.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          destinations: { $push: '$destination' },
          totalAccess: { $sum: '$accessCount' }
        }
      }
    ]);

    const stats = cacheStats[0] || { count: 0, destinations: [], totalAccess: 0 };

    res.json({
      count: stats.count,
      destinations: [...new Set(stats.destinations)], // Remove duplicates
      totalAccess: stats.totalAccess
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({ message: 'Server error getting cache stats' });
  }
});

// Clear user's cache (optional)
app.delete('/api/itinerary/clear-cache', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { destination } = req.body;

    let deleteQuery = { userId };
    if (destination) {
      deleteQuery.destination = destination;
    }

    const result = await ItineraryCache.deleteMany(deleteQuery);

    res.json({
      message: destination 
        ? `Cache cleared for ${destination}` 
        : 'All cache cleared',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ message: 'Server error clearing cache' });
  }
});

// Test endpoints
app.get('/api/test-auth', authenticateToken, (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Authentication working', 
    user: { id: req.user.userId, email: req.user.email } 
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Test endpoint to verify routing
app.get('/api/test/ping', (req, res) => {
  res.json({ status: 'OK', message: 'Test endpoint working' });
});

// Alternative GET endpoint for clearing data (easier to test)
app.get('/api/test/clear-all-data-get', authenticateToken, async (req, res) => {
  try {
    console.log('Clear all data GET endpoint hit by user:', req.user.userId);
    const userId = req.user.userId;
    
    // Delete all user's Travel DNA
    const dnaResult = await TravelDNA.deleteMany({ userId });
    
    // Delete all user's trips
    const tripsResult = await Trip.deleteMany({ userId });
    
    // Delete all user's cached itineraries
    const cacheResult = await ItineraryCache.deleteMany({ userId });
    
    console.log(`Cleared data for user ${userId}:`, {
      travelDNA: dnaResult.deletedCount,
      trips: tripsResult.deletedCount,
      cache: cacheResult.deletedCount
    });
    
    res.json({
      message: 'All user data cleared successfully',
      deleted: {
        travelDNA: dnaResult.deletedCount,
        trips: tripsResult.deletedCount,
        cache: cacheResult.deletedCount
      }
    });
  } catch (error) {
    console.error('Clear data error:', error);
    res.status(500).json({ message: 'Server error clearing data' });
  }
});

// Clear all user data (for testing purposes)
app.delete('/api/test/clear-all-data', authenticateToken, async (req, res) => {
  try {
    console.log('Clear all data endpoint hit by user:', req.user.userId);
    const userId = req.user.userId;
    
    // Delete all user's Travel DNA
    const dnaResult = await TravelDNA.deleteMany({ userId });
    
    // Delete all user's trips
    const tripsResult = await Trip.deleteMany({ userId });
    
    // Delete all user's cached itineraries
    const cacheResult = await ItineraryCache.deleteMany({ userId });
    
    console.log(`Cleared data for user ${userId}:`, {
      travelDNA: dnaResult.deletedCount,
      trips: tripsResult.deletedCount,
      cache: cacheResult.deletedCount
    });
    
    res.json({
      message: 'All user data cleared successfully',
      deleted: {
        travelDNA: dnaResult.deletedCount,
        trips: tripsResult.deletedCount,
        cache: cacheResult.deletedCount
      }
    });
  } catch (error) {
    console.error('Clear data error:', error);
    res.status(500).json({ message: 'Server error clearing data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
