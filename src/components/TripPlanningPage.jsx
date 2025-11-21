import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { tripAPI, activityAPI, travelDNAAPI } from '../services/api';
import { checkCachedItinerary, cacheItinerary, getCacheStats } from '../services/cacheService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './TripPlanningPage.css';
import { normalizeActivityType, getActivityTypeClass, getActivityTypeIcon, getActivityTypeLabel } from './ui/activityTypeUtils';

const TripPlanningPage = ({ userTravelDNA, onBack }) => {
  const [tripData, setTripData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    budget: 50000, // Default budget in INR
    travelers: 1,
    accommodation: 'hotel',
    transportation: 'flight'
  });
  const [generatedItinerary, setGeneratedItinerary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Activity interaction states
  const [activityStatuses, setActivityStatuses] = useState({}); // {dayIndex-activityIndex: 'done'|'skipped'|'active'}
  const [showAlternatives, setShowAlternatives] = useState({}); // {dayIndex-activityIndex: true/false}
  const [alternativeActivities, setAlternativeActivities] = useState({}); // {dayIndex-activityIndex: [alternatives]}

  // New feature states
  const [currentTripId, setCurrentTripId] = useState(null);
  const [shareableLink, setShareableLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [cacheStats, setCacheStats] = useState({ count: 0, destinations: [], totalAccess: 0 });

  // Initialize AI
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  // Check if API key is available
  const hasValidAPIKey = import.meta.env.VITE_GEMINI_API_KEY &&
                         import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here';

  // Normalize Travel DNA for compact bars (handles backend and local formats)
  const budgetEnumToRatio = (e) => {
    if (e === 'budget') return 0.2;
    if (e === 'mid-range') return 0.6;
    if (e === 'luxury') return 1;
    return 0.6; // default midpoint
  };

  const paceEnumToLabel = (e) => {
    if (e === 'slow') return 'relaxed';
    if (e === 'moderate') return 'balanced';
    if (e === 'fast') return 'active';
    return e || 'balanced';
  };

  const clamp01 = (n) => {
    const v = Number(n);
    if (Number.isNaN(v)) return 0;
    return Math.max(0, Math.min(1, v));
  };

  const normalizedDNA = (() => {
    const dna = userTravelDNA || {};
    if (dna.initialDNA) {
      return {
        adventure: clamp01(dna.initialDNA.adventure),
        culture: clamp01(dna.initialDNA.culture),
        foodie: clamp01(dna.initialDNA.foodie),
        budget: clamp01(budgetEnumToRatio(dna.initialDNA.budget)),
        pace: paceEnumToLabel(dna.initialDNA.pace),
      };
    }
    const budgetVal = typeof dna.budget === 'number' ? dna.budget : budgetEnumToRatio(dna.budget);
    return {
      adventure: clamp01(dna.adventure),
      culture: clamp01(dna.culture),
      foodie: clamp01(dna.foodie),
      budget: clamp01(budgetVal),
      pace: dna.pace || 'balanced',
    };
  })();

  // Load cache stats on component mount
  useEffect(() => {
    const loadCacheStats = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        const stats = await getCacheStats();
        setCacheStats(stats);
      }
    };
    loadCacheStats();
  }, []);

  // Disable browser back button on this page; allow only explicit Back to Dashboard button
  useEffect(() => {
    // Push a new state so back keeps you on the same URL
    window.history.pushState(null, document.title, window.location.href);

    const handlePopState = () => {
      // Immediately push state again to negate the back navigation
      window.history.pushState(null, document.title, window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTripData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Activity interaction handlers
  const handleMarkAsDone = (dayIndex, activityIndex) => {
    const key = `${dayIndex}-${activityIndex}`;
    setActivityStatuses(prev => ({
      ...prev,
      [key]: prev[key] === 'done' ? 'active' : 'done'
    }));
    
    // Log completion event
    console.log(`Activity marked as ${activityStatuses[key] === 'done' ? 'active' : 'done'}:`, 
       generatedItinerary.dailyItinerary[dayIndex].activities[activityIndex].activity);
  };

  const handleSkipActivity = (dayIndex, activityIndex) => {
    const key = `${dayIndex}-${activityIndex}`;
    setActivityStatuses(prev => ({
      ...prev,
      [key]: prev[key] === 'skipped' ? 'active' : 'skipped'
    }));
    
    // Log skip feedback event
    console.log(`Activity ${activityStatuses[key] === 'skipped' ? 'reactivated' : 'skipped'}:`, 
       generatedItinerary.dailyItinerary[dayIndex].activities[activityIndex].activity);
  };

  const generateAlternativeActivity = (dayIndex, activityIndex, originalActivity) => {
    // Generate alternative activities based on the original activity type and user preferences
    const alternatives = [];
    const activityTypes = ['adventure', 'culture', 'foodie', 'relaxation'];

    // Determine activity type based on keywords
    let activityType = 'culture'; // default
    const activityName = originalActivity.activity.toLowerCase();

    if (activityName.includes('trek') || activityName.includes('climb') || activityName.includes('adventure') || 
        activityName.includes('rafting') || activityName.includes('diving') || activityName.includes('zip')) {
      activityType = 'adventure';
    } else if (activityName.includes('food') || activityName.includes('cook') || activityName.includes('market') || 
               activityName.includes('restaurant') || activityName.includes('taste')) {
      activityType = 'foodie';
    } else if (activityName.includes('spa') || activityName.includes('relax') || activityName.includes('beach') || 
               activityName.includes('yoga') || activityName.includes('meditation')) {
      activityType = 'relaxation';
    }

    // Generate 3 alternatives based on activity type
    const alternativeOptions = {
      adventure: [
        { activity: "Scenic helicopter ride", cost: 8000, duration: "1 hour", time: originalActivity.time },
        { activity: "Mountain biking expedition", cost: 2500, duration: "3 hours", time: originalActivity.time },
        { activity: "Kayaking adventure", cost: 3500, duration: "2.5 hours", time: originalActivity.time },
        { activity: "Rock climbing session", cost: 2000, duration: "2 hours", time: originalActivity.time },
        { activity: "Bungee jumping experience", cost: 4500, duration: "1 hour", time: originalActivity.time }
      ],
      culture: [
        { activity: "Local artisan workshop", cost: 1800, duration: "2.5 hours", time: originalActivity.time },
        { activity: "Traditional music performance", cost: 1200, duration: "2 hours", time: originalActivity.time },
        { activity: "Heritage photography walk", cost: 800, duration: "3 hours", time: originalActivity.time },
        { activity: "Ancient architecture tour", cost: 600, duration: "2.5 hours", time: originalActivity.time },
        { activity: "Cultural storytelling session", cost: 500, duration: "1.5 hours", time: originalActivity.time }
      ],
      foodie: [
        { activity: "Private chef cooking class", cost: 3500, duration: "3 hours", time: originalActivity.time },
        { activity: "Wine and cheese pairing", cost: 2800, duration: "2 hours", time: originalActivity.time },
        { activity: "Street food photography tour", cost: 1500, duration: "3 hours", time: originalActivity.time },
        { activity: "Farm visit and organic lunch", cost: 2200, duration: "4 hours", time: originalActivity.time },
        { activity: "Rooftop dining experience", cost: 3000, duration: "2.5 hours", time: originalActivity.time }
      ],
      relaxation: [
        { activity: "Sunset meditation session", cost: 800, duration: "1.5 hours", time: originalActivity.time },
        { activity: "Therapeutic massage", cost: 2500, duration: "2 hours", time: originalActivity.time },
        { activity: "Nature walk and picnic", cost: 500, duration: "3 hours", time: originalActivity.time },
        { activity: "Hot stone therapy", cost: 3200, duration: "2 hours", time: originalActivity.time },
        { activity: "Mindfulness workshop", cost: 1200, duration: "2.5 hours", time: originalActivity.time }
      ]
    };

    // Select 3 random alternatives from the appropriate category
    const options = alternativeOptions[activityType] || alternativeOptions.culture;
    const shuffled = [...options].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  const handleSuggestAlternative = (dayIndex, activityIndex) => {
    const key = `${dayIndex}-${activityIndex}`;
    const originalActivity = generatedItinerary.dailyItinerary[dayIndex].activities[activityIndex];
    
    if (!alternativeActivities[key]) {
      const alternatives = generateAlternativeActivity(dayIndex, activityIndex, originalActivity);
      setAlternativeActivities(prev => ({
        ...prev,
        [key]: alternatives
      }));
    }
    
    setShowAlternatives(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    console.log(`Alternative suggestions ${showAlternatives[key] ? 'hidden' : 'shown'} for:`, originalActivity.activity);
  };

  const handleSelectAlternative = (dayIndex, activityIndex, alternativeActivity) => {
    // Replace the original activity with the selected alternative
    setGeneratedItinerary(prev => {
      const newItinerary = { ...prev };
      newItinerary.dailyItinerary[dayIndex].activities[activityIndex] = alternativeActivity;
      return newItinerary;
    });
    
    // Hide alternatives popup
    const key = `${dayIndex}-${activityIndex}`;
    setShowAlternatives(prev => ({
      ...prev,
      [key]: false
    }));
    
    // Reset activity status
    setActivityStatuses(prev => ({
      ...prev,
      [key]: 'active'
    }));
    
    console.log('Activity replaced with alternative:', alternativeActivity.activity);
  };

  // Check if we should skip API testing due to quota limits
  const shouldSkipAPITest = () => {
    const lastQuotaError = localStorage.getItem('gemini_quota_error');
    if (lastQuotaError) {
      const errorTime = new Date(lastQuotaError);
      const now = new Date();
      const hoursSinceError = (now - errorTime) / (1000 * 60 * 60);

      // Skip API test if quota error was less than 1 hour ago
      if (hoursSinceError < 1) {
        console.log('Skipping API test due to recent quota error');
        return true;
      } else {
        // Clear old quota error
        localStorage.removeItem('gemini_quota_error');
      }
    }
    return false;
  };

  // Test API key function with quota management
  const testAPIKey = async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Skip testing if we recently hit quota limits
    // if (shouldSkipAPITest()) {
    //   return { success: false, model: null, reason: 'quota_skip' };
    // }

    // Try with minimal test first (shortest possible request)
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];  // Current model names

    for (const modelName of models) {
      try {
        console.log(`Testing API key with model ${modelName}:`, apiKey?.substring(0, 10) + '...');
        
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hi");  // Minimal test
        const response = await result.response;
        const text = response.text();
        console.log(`API test successful with ${modelName}:`, text);
        return { success: true, model: modelName };
      } catch (error) {
        console.error(`API test failed with ${modelName}:`, error);

        // Check if it's a quota error
        if (error.message.includes('quota') || error.status === 429) {
          console.log('Quota exceeded, storing error timestamp');
          localStorage.setItem('gemini_quota_error', new Date().toISOString());
          return { success: false, model: null, reason: 'quota_exceeded' };
        }
        
        continue;
      }
    }

    return { success: false, model: null, reason: 'api_error' };
  };

  // Helper function to prepare trip parameters for caching
  const prepareTripParams = (tripData) => {
    const duration = Math.ceil((new Date(tripData.endDate) - new Date(tripData.startDate)) / (1000 * 60 * 60 * 24)) + 1;
    return {
      accommodation: tripData.accommodation,
      transportation: tripData.transportation,
      travelers: tripData.travelers,
      duration: duration
    };
  };

  const generateItineraryWithAI = async () => {
    if (!tripData.destination || !tripData.startDate || !tripData.endDate) {
      setError('Please fill in all required fields');
      return;
    }
    setIsGenerating(true);
    setError(null);
    setIsUsingCache(false);

    try {
      // Prepare trip parameters for caching
      const tripParams = prepareTripParams(tripData);
      
      // Check for cached itinerary first (only if user is logged in)
      const token = localStorage.getItem('token');
      if (token) {
        console.log('Checking backend cache for destination:', tripData.destination);
        const cacheResult = await checkCachedItinerary(tripData.destination, userTravelDNA, tripParams);
        
        if (cacheResult.cached) {
          console.log('Using cached itinerary from backend for destination:', tripData.destination);
          setGeneratedItinerary(cacheResult.itinerary);
          setIsUsingCache(true);
          
          // Reset activity interaction states for cached itinerary
          setActivityStatuses({});
          setShowAlternatives({});
          setAlternativeActivities({});
          
          // Show cache usage message
          setError(`✅ Using cached itinerary for this destination and preferences. Generated ${cacheResult.generatedBy === 'ai' ? 'by AI' : 'with mock data'} on ${new Date(cacheResult.createdAt).toLocaleDateString()}. No API quota used!`);
          setIsGenerating(false);
          return;
        }
        
        console.log('No cached itinerary found, proceeding with generation');
      } else {
        console.log('User not logged in, skipping cache check');
      }

      // Debug API key
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      console.log('API Key available:', !!apiKey);
      console.log('API Key length:', apiKey?.length);
      console.log('API Key starts with:', apiKey?.substring(0, 10));

      // Check if we have a valid API key
      if (!hasValidAPIKey) {
        console.log('No valid API key found, using enhanced mock data');
        await generateEnhancedMockItinerary();
        return;
      }

      // Test API key first
      console.log('Testing API key...');
      const apiTest = await testAPIKey();

      if (!apiTest.success) {
        if (apiTest.reason === 'quota_exceeded') {
          console.log('API quota exceeded, using enhanced mock data');
          setError('Gemini API quota exceeded. Using enhanced mock data with realistic trip plans.');
        } else if (apiTest.reason === 'quota_skip') {
          console.log('Skipping API due to recent quota error, using enhanced mock data');
          setError('API quota recently exceeded. Using enhanced mock data to avoid further quota usage.');
        } else {
          console.log('API key test failed, using enhanced mock data');
        }
        await generateEnhancedMockItinerary();
        return;
      }

      console.log(`Initializing AI with working model: ${apiTest.model}...`);
      const model = genAI.getGenerativeModel({ model: apiTest.model });
      const days = Math.ceil((new Date(tripData.endDate) - new Date(tripData.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      
      const prompt = `
  You are IntelliTrip, an expert travel planner. Your task is to generate a personalized ${days}-day travel itinerary for ${tripData.destination} in a specific JSON format.

  Follow these instructions in order:

  1.  **Analyze the Traveler's DNA Profile:** These scores dictate the mix of activities.
      -   Adventure Interest: ${Math.round(userTravelDNA.adventure * 100)}%
      -   Culture Interest: ${Math.round(userTravelDNA.culture * 100)}%
      -   Foodie Interest: ${Math.round(userTravelDNA.foodie * 100)}%
      -   Relaxation Interest: ${Math.round(userTravelDNA.relaxation * 100)}%
      -   Budget Style: ${userTravelDNA.budget > 0.7 ? 'Luxury' : userTravelDNA.budget > 0.4 ? 'Mid-Range' : 'Budget'}
      -   Desired Pace: ${userTravelDNA.pace}

  2.  **Adhere to the CRITICAL RULE:** The quantity of activities for each category in the final itinerary MUST be in ascending order of their scores. The category with the highest score must have the most activities. The category with the second-highest score must have the second-most activities, and so on. The distribution must directly reflect the DNA scores. For example, if Adventure is 80% and Foodie is 20%, there should be approximately four times more adventure activities than foodie activities.

  3.  **Use the Trip Specifications:**
      -   Destination: ${tripData.destination}
      -   Duration: ${days} days
      -   Budget: Approx. ₹${tripData.budget.toLocaleString('en-IN')}
      -   Travelers: ${tripData.travelers}

  4.  **Produce ONLY a valid JSON object** as the output, matching this exact structure:
      {
        "destination": "${tripData.destination}",
        "totalDays": ${days},
        "estimatedTotalCost": number,
        "costBreakdown": { "accommodation": number, "food": number, "activities": number, "transportation": number, "miscellaneous": number },
        "dailyItinerary": [
          {
            "day": number,
            "date": "YYYY-MM-DD",
            "theme": "A creative theme for the day",
            "activities": [
              {
                "time": "HH:MM",
                "activity": "Specific name of the activity or place",
                "location": "Specific location or address",
                "description": "A detailed, engaging description.",
                "cost": number,
                "type": "adventure" | "culture" | "foodie" | "relaxation",
                "duration": "X hours"
              }
            ],
            "meals": [],
            "accommodation": {}
          }
        ],
        "recommendations": {
          "bestTimeToVisit": "Seasonal advice",
          "localTips": ["Tip 1"],
          "packingList": ["Item 1"],
          "culturalEtiquette": ["Rule 1"]
        }
      }
`;
      console.log('Sending request to AI...');
      const result = await model.generateContent(prompt);
      console.log('Received response from AI');
      
      const response = await result.response;
      const text = response.text();
      
      console.log('Response text length:', text.length);
      console.log('Response preview:', text.substring(0, 200));

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('JSON found in response');
        console.log('Raw JSON string:', jsonMatch[0]);
        
        let itineraryData;
        try {
          itineraryData = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed itinerary data');
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          console.error('Problematic JSON:', jsonMatch[0]);
          
          // Try to fix common JSON issues
          let fixedJson = jsonMatch[0]
            .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
            .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Add quotes to keys
            .replace(/:\s*'([^']*)'/g, ':"$1"'); // Replace single quotes with double quotes
            
          console.log('Attempting to parse fixed JSON:', fixedJson);
          itineraryData = JSON.parse(fixedJson);
          console.log('Successfully parsed fixed itinerary data');
        }
        
        // Cache the generated itinerary in backend (only if user is logged in)
        const token = localStorage.getItem('token');
        if (token) {
          const tripParams = prepareTripParams(tripData);
          const cacheSuccess = await cacheItinerary(tripData.destination, userTravelDNA, tripParams, itineraryData, 'ai');
          if (cacheSuccess) {
            console.log('AI itinerary cached in backend for future use');
            // Refresh cache stats
            const stats = await getCacheStats();
            setCacheStats(stats);
          }
        }
        
        console.log('Generated itinerary structure:', JSON.stringify(itineraryData, null, 2));
        setGeneratedItinerary(itineraryData);
        
        // Reset activity interaction states for new itinerary
        setActivityStatuses({});
        setShowAlternatives({});
        setAlternativeActivities({});

      } else {
        console.log('No JSON found in response, using fallback');
        throw new Error('Failed to parse AI response');
      }

    } catch (error) {
      console.error('Detailed error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error status:', error.status);
      console.error('Error statusText:', error.statusText);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('403') || error.status === 403) {
        setError('Invalid API key. Please check your Gemini API key configuration.');
      } else if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('quota') || error.status === 429) {
        setError('Gemini API quota exceeded. The free tier has daily/hourly limits. Using enhanced mock data instead.');
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else if (error.status === 400) {
        setError('Bad request. The model name or request format may be incorrect.');
      } else if (error.status === 404) {
        setError('Model not found. The Gemini model may not be available.');
      } else {
        setError(`AI generation failed: ${error.message} (Status: ${error.status}). Using fallback data.`);
      }

      // Fallback to enhanced mock data
      console.log('Falling back to enhanced mock data');
      await generateEnhancedMockItinerary();
    } finally {
      setIsGenerating(false);
    }
  };

  const generateEnhancedMockItinerary = async () => {
    const days = Math.ceil((new Date(tripData.endDate) - new Date(tripData.startDate)) / (1000 * 60 * 60 * 24)) + 1;
    
    const mockItinerary = {
      destination: tripData.destination,
      totalDays: days,
      estimatedTotalCost: Math.round(tripData.budget * 0.9),
      costBreakdown: {
        accommodation: Math.round(tripData.budget * 0.4),
        food: Math.round(tripData.budget * 0.25),
        activities: Math.round(tripData.budget * 0.2),
        transportation: Math.round(tripData.budget * 0.1),
        miscellaneous: Math.round(tripData.budget * 0.05)
      },
      dailyItinerary: generateMockDailyItinerary(days),
      recommendations: {
        bestTimeToVisit: "October to March for pleasant weather",
        localTips: [
          "Carry cash as many local vendors don't accept cards",
          "Learn basic local phrases for better interaction",
          "Respect local customs and dress codes"
        ],
        packingList: [
          "Comfortable walking shoes",
          "Light cotton clothes",
          "Sunscreen and hat",
          "Portable charger"
        ],
        culturalEtiquette: [
          "Remove shoes before entering temples",
          "Dress modestly in religious places",
          "Use right hand for eating and greeting"
        ]
      }
    };

    // Cache the mock itinerary in backend too (only if user is logged in)
    const token = localStorage.getItem('token');
    if (token) {
      const tripParams = prepareTripParams(tripData);
      const cacheSuccess = await cacheItinerary(tripData.destination, userTravelDNA, tripParams, mockItinerary, 'mock');
      if (cacheSuccess) {
        console.log('Mock itinerary cached in backend for future use');
        // Refresh cache stats
        const stats = await getCacheStats();
        setCacheStats(stats);
      }
    }
    
    setGeneratedItinerary(mockItinerary);

    // Reset activity interaction states for new itinerary
    setActivityStatuses({});
    setShowAlternatives({});
    setAlternativeActivities({});
  };

  const generateMockDailyItinerary = (days) => {
    const activities = {
      adventure: [
        { name: "Mountain trekking expedition", cost: 2500, duration: "4 hours" },
        { name: "White water rafting adventure", cost: 3000, duration: "3 hours" },
        { name: "Rock climbing challenge", cost: 2000, duration: "2 hours" },
        { name: "Paragliding experience", cost: 4000, duration: "1 hour" },
        { name: "Zip-lining through canopy", cost: 1800, duration: "2 hours" },
        { name: "Scuba diving expedition", cost: 5000, duration: "4 hours" }
      ],
      culture: [
        { name: "Ancient temple exploration", cost: 500, duration: "3 hours" },
        { name: "Local history museum", cost: 300, duration: "2 hours" },
        { name: "Traditional pottery workshop", cost: 1500, duration: "2 hours" },
        { name: "Heritage architecture walk", cost: 800, duration: "3 hours" },
        { name: "Folk dance performance", cost: 1200, duration: "2 hours" },
        { name: "Artisan village visit", cost: 600, duration: "3 hours" }
      ],
      foodie: [
        { name: "Authentic street food tour", cost: 1200, duration: "3 hours" },
        { name: "Traditional cooking masterclass", cost: 2500, duration: "4 hours" },
        { name: "Spice market exploration", cost: 500, duration: "2 hours" },
        { name: "Local wine & cheese tasting", cost: 3500, duration: "2 hours" },
        { name: "Farm-to-table dining experience", cost: 2800, duration: "3 hours" },
        { name: "Rooftop food crawl", cost: 1800, duration: "4 hours" }
      ],
      relaxation: [
        { name: "Ayurvedic spa retreat", cost: 3000, duration: "2 hours" },
        { name: "Pristine beach meditation", cost: 0, duration: "3 hours" },
        { name: "Botanical garden stroll", cost: 200, duration: "1 hour" },
        { name: "Golden hour sunset viewing", cost: 0, duration: "1 hour" },
        { name: "Lakeside yoga session", cost: 800, duration: "1.5 hours" },
        { name: "Hot springs relaxation", cost: 1500, duration: "2 hours" }
      ]
    };

    // Creative experience themes for each day
    const experienceThemes = [
      "Authentic Local Immersion",
      "Sunset Photography Hour", 
      "Cultural Heritage Discovery",
      "Adventure Seeker's Paradise",
      "Foodie's Secret Journey",
      "Tranquil Wellness Escape",
      "Hidden Gems Exploration",
      "Artistic Soul Connection",
      "Nature's Grand Theater",
      "Mystical Morning Rituals",
      "Urban Explorer's Quest",
      "Seaside Serenity Day",
      "Mountain Peak Conquest",
      "Traditional Craft Mastery",
      "Culinary Time Travel"
    ];

    const dailyItinerary = [];

    for (let day = 1; day <= days; day++) {
      const date = new Date(tripData.startDate);
      date.setDate(date.getDate() + day - 1);

      // Select activities by Travel DNA scores (0–10). Include relaxation and sort by score.
      const CATEGORY_LIST = ['adventure','culture','foodie','relaxation'];
      const score10 = (name) => {
        const dna = userTravelDNA || {};
        const s10 = Number(dna?.[`${name}Score`]);
        if (!Number.isNaN(s10) && s10 >= 0) return s10;
        const s01 = Number((dna.initialDNA?.[name] ?? dna?.[name]));
        if (!Number.isNaN(s01) && s01 > 0 && s01 <= 1) return s01 * 10;
        return 0;
      };
      const WEIGHTS10 = Object.fromEntries(CATEGORY_LIST.map(c => [c, score10(c)]));
      const sortedCategories = [...CATEGORY_LIST].sort((a,b) => (WEIGHTS10[b]||0) - (WEIGHTS10[a]||0));
      
      // ***** ADDED THIS LINE FOR DEBUGGING *****
      console.log(`DAY ${day} - Prioritized Categories:`, sortedCategories);

      const dayActivities = [];
      
      // Morning activity (dominant category)
      let morningType = sortedCategories.find(c => activities[c]?.length) || 'culture';
      if (activities[morningType]) {
        const activity = activities[morningType][Math.floor(Math.random() * activities[morningType].length)];
        dayActivities.push({
          time: "09:00",
          activity: activity.name,
          location: `${tripData.destination} - Popular Area`,
          description: `Experience ${activity.name} in the heart of ${tripData.destination}`,
          cost: activity.cost,
          type: morningType,
          duration: activity.duration
        });
      }

      // Afternoon activity (second-best category by DNA score)
      const afternoonType = sortedCategories.find(c => c !== morningType && activities[c]?.length) || morningType;
      if (activities[afternoonType]) {
        const activity = activities[afternoonType][Math.floor(Math.random() * activities[afternoonType].length)];
        dayActivities.push({
          time: "14:00",
          activity: activity.name,
          location: `${tripData.destination} - Cultural District`,
          description: `Immerse yourself in ${activity.name}`,
          cost: activity.cost,
          type: afternoonType,
          duration: activity.duration
        });
      }

      // Evening activity (weighted by full DNA scores across all categories)
      const availableCats = ['adventure','culture','foodie','relaxation'].filter(c => activities[c]?.length);
      let eveningType = availableCats[0] || 'culture';
      if (availableCats.length > 0) {
        const total = availableCats.reduce((sum, c) => sum + (WEIGHTS10[c] || 0), 0);
        if (total > 0) {
          const r = Math.random() * total; let acc = 0;
          for (const c of availableCats) { acc += (WEIGHTS10[c] || 0); if (r <= acc) { eveningType = c; break; } }
        }
      }
      if (activities[eveningType]) {
        const activity = activities[eveningType][Math.floor(Math.random() * activities[eveningType].length)];
        dayActivities.push({
          time: "18:00",
          activity: activity.name,
          location: `${tripData.destination} - Scenic Area`,
          description: `End your day with ${activity.name}`,
          cost: activity.cost,
          type: eveningType,
          duration: activity.duration
        });
      }

      // Select a creative theme for this day
      const themeIndex = (day - 1) % experienceThemes.length;
      const dayTheme = experienceThemes[themeIndex];

      dailyItinerary.push({
        day,
        date: date.toISOString().split('T')[0],
        theme: dayTheme,
        activities: dayActivities,
        meals: [
          {
            type: "breakfast",
            restaurant: "Local Breakfast Spot",
            cuisine: "Local",
            cost: 300,
            location: "Near accommodation"
          },
          {
            type: "lunch",
            restaurant: "Traditional Restaurant",
            cuisine: "Regional",
            cost: 600,
            location: "City center"
          },
          {
            type: "dinner",
            restaurant: "Popular Local Eatery",
            cuisine: "Local specialties",
            cost: 800,
            location: "Tourist area"
          }
        ],
        accommodation: {
          name: `${tripData.accommodation === 'hotel' ? 'Comfort Hotel' : tripData.accommodation === 'hostel' ? 'Backpacker Hostel' : 'Luxury Resort'}`,
          type: tripData.accommodation,
          cost: Math.round(tripData.budget * 0.4 / days),
          location: "City center"
        }
      });
    }
    return dailyItinerary;
  };

  // Auto-generate when form is complete
  useEffect(() => {
    if (tripData.destination && tripData.startDate && tripData.endDate && tripData.budget) {
      const timer = setTimeout(() => {
        generateItineraryWithAI();
      }, 1000); // Debounce for 1 second
      return () => clearTimeout(timer);
    }
  }, [tripData.destination, tripData.startDate, tripData.endDate, tripData.budget]);

  // Save itinerary function
  const handleSaveItinerary = async (startDate, endDate) => {
  if (!generatedItinerary) return;

  setIsSaving(true);

  // Check if user is authenticated
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Please log in to save your itinerary');
  }

  try {
    // Keep the date exactly as the HTML date input gives it: "YYYY-MM-DD"
  const formatDate = (dateStr) => {
  if (!dateStr) return null;
  return dateStr;
};


    // Validate required trip data
    if (!tripData.destination || !tripData.startDate || !tripData.endDate) {
      throw new Error('Missing required trip information (destination, start date, or end date)');
    }

    // ✅ Use different variable names to avoid shadowing
    const formattedStartDate = formatDate(tripData.startDate);
    const formattedEndDate = formatDate(tripData.endDate);

    if (!formattedStartDate || !formattedEndDate) {
      throw new Error('Invalid date format');
    }

    // Additional date validation
    const startDateObj = new Date(formattedStartDate);
    const endDateObj = new Date(formattedEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error('Invalid date format. Please select valid dates.');
    }

    if (startDateObj >= endDateObj) {
      throw new Error('End date must be after start date.');
    }

    if (startDateObj < today) {
      console.warn('Start date is in the past, but allowing it...');
    }

    // Get user information for the trip
    const userEmail = localStorage.getItem('userEmail') || localStorage.getItem('email');
    const userId = localStorage.getItem('userId') || localStorage.getItem('user_id');

    console.log('User info for trip:', { userEmail, userId });

    // --- Sanitization helpers (unchanged) ---
    const sanitizeString = (str, maxLength = 255) => {
      if (!str || typeof str !== 'string') return '';
      return str.trim().replace(/[<>\"'&]/g, '').substring(0, maxLength);
    };

    const sanitizeNumber = (num, defaultVal = 0, min = 0, max = 999999) => {
      const parsed = parseInt(num);
      if (isNaN(parsed) || parsed < min || parsed > max) return defaultVal;
      return parsed;
    };

    const sanitizeItinerary = (itinerary) => {
      if (!itinerary || typeof itinerary !== 'object') return { dailyItinerary: [] };

      const sanitizeStringArray = (arr, maxLen = 500) => Array.isArray(arr)
        ? arr.map(item => sanitizeString(item || '', maxLen)).filter(Boolean)
        : [];

      const sanitizedItinerary = {
        destination: sanitizeString(itinerary?.destination || tripData.destination || '', 200),
        totalDays: sanitizeNumber(itinerary.totalDays, 1, 1, 30),
        estimatedTotalCost: sanitizeNumber(itinerary.estimatedTotalCost, 0, 0, 1000000),
        costBreakdown: {
          accommodation: sanitizeNumber(itinerary?.costBreakdown?.accommodation, 0, 0, 1000000),
          food: sanitizeNumber(itinerary?.costBreakdown?.food, 0, 0, 1000000),
          activities: sanitizeNumber(itinerary?.costBreakdown?.activities, 0, 0, 1000000),
          transportation: sanitizeNumber(itinerary?.costBreakdown?.transportation, 0, 0, 1000000),
          miscellaneous: sanitizeNumber(itinerary?.costBreakdown?.miscellaneous, 0, 0, 1000000)
        },
        recommendations: {
          bestTimeToVisit: sanitizeString(itinerary?.recommendations?.bestTimeToVisit || '', 500),
          localTips: sanitizeStringArray(itinerary?.recommendations?.localTips, 300),
          packingList: sanitizeStringArray(itinerary?.recommendations?.packingList, 200),
          culturalEtiquette: sanitizeStringArray(itinerary?.recommendations?.culturalEtiquette, 300)
        },
        dailyItinerary: []
      };

      if (Array.isArray(itinerary.dailyItinerary)) {
        sanitizedItinerary.dailyItinerary = itinerary.dailyItinerary.map((day, index) => ({
          day: sanitizeNumber(day?.day || (index + 1), 1, 1, 30),
          date: sanitizeString(day?.date || '', 20),
          theme: sanitizeString(day?.theme || 'Exploration', 100),
          activities: Array.isArray(day?.activities) ? day.activities.map(activity => ({
            time: sanitizeString(activity?.time || '', 50),
            activity: sanitizeString(activity?.activity || '', 200),
            location: sanitizeString(activity?.location || 'TBD', 100),
            description: sanitizeString(activity?.description || 'Details to be decided', 500),
            cost: sanitizeNumber(activity?.cost, 0, 0, 10000),
            duration: sanitizeString(activity?.duration || '2 hours', 20),
            type: (['adventure','culture','foodie','relaxation'].includes(activity?.type)
              ? activity.type
              : (['adventure','culture','foodie','relaxation'].includes(activity?.category)
                ? activity.category
                : (() => {
                    const name = (activity?.activity || '').toLowerCase();
                    if (/trek|climb|adventure|raft|diving|zip|hike|kayak|bike|bungee/.test(name)) return 'adventure';
                    if (/food|cook|market|restaurant|taste|wine|cheese|ramen|sushi/.test(name)) return 'foodie';
                    if (/spa|relax|beach|yoga|meditation|garden|cruise/.test(name)) return 'relaxation';
                    return 'culture';
                  })()
              ))
          })) : []
        }));
      } else {
        const tripDuration = Math.ceil((new Date(formattedEndDate) - new Date(formattedStartDate)) / (1000 * 60 * 60 * 24));
        sanitizedItinerary.dailyItinerary = [];
        for (let i = 0; i < tripDuration; i++) {
          const dayDate = new Date(formattedStartDate);
          dayDate.setDate(dayDate.getDate() + i);
          sanitizedItinerary.dailyItinerary.push({
            day: i + 1,
            date: dayDate.toISOString().split('T')[0],
            theme: 'Exploration',
            activities: []
          });
        }
      }

      return sanitizedItinerary;
    };

    // Sanitize trip inputs
    const sanitizedDestination = sanitizeString(tripData.destination);
    const sanitizedBudget = sanitizeNumber(tripData.budget, 1000, 100, 100000);
    const sanitizedTravelers = sanitizeNumber(tripData.travelers, 1, 1, 20);
    const sanitizedAccommodation = sanitizeString(tripData.accommodation || 'Hotel');
    const sanitizedTransportation = sanitizeString(tripData.transportation || 'Flight');
    const sanitizedStartDate = tripData.startDate;
    const sanitizedEndDate = tripData.endDate;
    const sanitizedItinerary = sanitizeItinerary(generatedItinerary);

    if (!sanitizedDestination) {
      throw new Error('Destination is required and must be valid text');
    }

    // Create trip object
    const tripToSave = {
      destination: sanitizedDestination,
      startDate: sanitizedStartDate,
      endDate: sanitizedEndDate,
      budget: sanitizedBudget,
      travelers: sanitizedTravelers,
      accommodation: sanitizedAccommodation,
      transportation: sanitizedTransportation,
      status: 'planned',
      itinerary: sanitizedItinerary,
      travelDNA: {
        adventure: userTravelDNA?.adventure || 0.5,
        culture: userTravelDNA?.culture || 0.5,
        foodie: userTravelDNA?.foodie || 0.5,
        relaxation: userTravelDNA?.relaxation || 0.5,
        budget: userTravelDNA?.budget || 0.5,
        pace: userTravelDNA?.pace || 'moderate'
      },
      generatedBy: 'ai',
      createdAt: new Date().toISOString(),
      version: '1.0',
      userEmail: userEmail,
      userId: userId
    };

    console.log('=== SAVE ITINERARY DEBUG ===');
    console.log('Trip data to save:', tripToSave);

    // Save to backend
    const savedTrip = await tripAPI.createTrip(tripToSave);
    console.log('Trip saved successfully:', savedTrip);

    // Save backup in localStorage
    const savedItineraries = JSON.parse(localStorage.getItem('savedItineraries') || '[]');
    savedItineraries.push({
      id: savedTrip.trip?._id || Date.now().toString(),
      ...generatedItinerary,
      tripData,
      savedAt: new Date().toISOString(),
      userTravelDNA
    });
    localStorage.setItem('savedItineraries', JSON.stringify(savedItineraries));

    alert('✅ Itinerary saved successfully! You can view it in "My Trips".');

  } catch (error) {
    console.error('Failed to save itinerary:', error);
    alert(`❌ Failed to save itinerary: ${error.message}`);
  } finally {
    setIsSaving(false);
  }
};


  // Generate shareable link
  const handleShareItinerary = async () => {
    if (!generatedItinerary) return;
    try {
      const shareData = {
        destination: generatedItinerary.destination,
        totalDays: generatedItinerary.totalDays,
        estimatedTotalCost: generatedItinerary.estimatedTotalCost,
        dailyItinerary: generatedItinerary.dailyItinerary,
        costBreakdown: generatedItinerary.costBreakdown,
        recommendations: generatedItinerary.recommendations,
        sharedAt: new Date().toISOString()
      };
      // Create a shareable ID
      const shareId = btoa(JSON.stringify(shareData)).replace(/[+/=]/g, '');
      
      // Store in localStorage with the shareId
      localStorage.setItem(`shared_${shareId}`, JSON.stringify(shareData));

      // Generate the shareable link
      const shareLink = `${window.location.origin}/shared/${shareId}`;
      setShareableLink(shareLink);
      setShowShareModal(true);

      // Copy to clipboard
      await navigator.clipboard.writeText(shareLink);
    } catch (error) {
      console.error('Failed to create shareable link:', error);
      alert('❌ Failed to create shareable link. Please try again.');
    }
  };

  // Export to PDF function
  const handleExportPDF = async () => {
    if (!generatedItinerary) return;
    setIsExporting(true);
    try {
      // Create a temporary div with the itinerary content
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.padding = '20px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin-bottom: 10px;">🎯 ${generatedItinerary.destination} Itinerary</h1>
          <p style="color: #7f8c8d; font-size: 16px;">${generatedItinerary.totalDays} Days • ₹${generatedItinerary.estimatedTotalCost?.toLocaleString('en-IN')}</p>
        </div>
        ${generatedItinerary.costBreakdown ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">💰 Cost Breakdown</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
            <div>🏨 Accommodation: ₹${generatedItinerary.costBreakdown.accommodation?.toLocaleString('en-IN')}</div>
            <div>🍽️ Food: ₹${generatedItinerary.costBreakdown.food?.toLocaleString('en-IN')}</div>
            <div>🎯 Activities: ₹${generatedItinerary.costBreakdown.activities?.toLocaleString('en-IN')}</div>
            <div>🚗 Transportation: ₹${generatedItinerary.costBreakdown.transportation?.toLocaleString('en-IN')}</div>
          </div>
        </div>
        ` : ''}
        <div style="margin-bottom: 30px;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">📅 Daily Itinerary</h2>
          ${generatedItinerary.dailyItinerary?.map((day, index) => `
            <div style="margin-bottom: 25px; border: 1px solid #ecf0f1; border-radius: 8px; overflow: hidden;">
              <div style="background: #3498db; color: white; padding: 15px;">
                <h3 style="margin: 0;">Day ${index + 1}: ${day.theme}</h3>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">${day.location}</p>
              </div>
              <div style="padding: 15px;">
                ${day.activities?.map(activity => `
                  <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                    <div style="font-weight: bold; color: #2c3e50;">${activity.time} - ${activity.activity}</div>
                    <div style="color: #7f8c8d; margin-top: 5px;">${activity.description}</div>
                    <div style="color: #27ae60; font-weight: bold; margin-top: 5px;">₹${activity.cost}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        ${generatedItinerary.recommendations ? `
        <div>
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">💡 Recommendations</h2>
          
          ${generatedItinerary.recommendations.localTips ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #2c3e50;">Local Tips</h3>
            <ul style="color: #7f8c8d;">
              ${generatedItinerary.recommendations.localTips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          ${generatedItinerary.recommendations.packingList ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #2c3e50;">Packing List</h3>
            <ul style="color: #7f8c8d;">
              ${generatedItinerary.recommendations.packingList.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          ${generatedItinerary.recommendations.culturalEtiquette ? `
          <div>
            <h3 style="color: #2c3e50;">Cultural Etiquette</h3>
            <ul style="color: #7f8c8d;">
              ${generatedItinerary.recommendations.culturalEtiquette.map(rule => `<li>${rule}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        </div>
        ` : ''}
        <div style="margin-top: 40px; text-align: center; color: #95a5a6; font-size: 12px;">
          Generated by IntelliTrip • ${new Date().toLocaleDateString()}
        </div>
      `;
      document.body.appendChild(tempDiv);

      // Convert to canvas and then PDF
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // Cleanup temp element
      document.body.removeChild(tempDiv);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${generatedItinerary.destination}-itinerary.pdf`);
      alert('✅ PDF exported successfully!');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('❌ Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="trip-planning-page">
      {/* Left Side - Form (30%) */}
      <div className="trip-form-section">
        <div className="form-header">
          <button className="back-button" onClick={onBack}>
            ← Back to Dashboard
          </button>
          <h2>🗺️ Plan Your Perfect Trip</h2>
          
          {/* AI Status Indicator */}
          <div className="ai-status">
            {hasValidAPIKey ? (
              <span className="ai-enabled">🤖 AI-Powered Planning Enabled</span>
            ) : (
              <span className="ai-disabled">⚠️ Using Demo Mode (Add API key for AI)</span>
            )}
          </div>
          
          {/* Travel DNA Summary */}
          <div className="dna-summary-compact">
            <h4>Your Travel DNA:</h4>
            <div className="dna-bars">
              <div className="dna-bar">
                <span>Adventure</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${normalizedDNA.adventure * 100}%` }}></div>
                </div>
                <span>{Math.round(normalizedDNA.adventure * 100)}%</span>
              </div>
              <div className="dna-bar">
                <span>Culture</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${normalizedDNA.culture * 100}%` }}></div>
                </div>
                <span>{Math.round(normalizedDNA.culture * 100)}%</span>
              </div>
              <div className="dna-bar">
                <span>Foodie</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${normalizedDNA.foodie * 100}%` }}></div>
                </div>
                <span>{Math.round(normalizedDNA.foodie * 100)}%</span>
              </div>
              <div className="dna-bar">
                <span>Budget</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${normalizedDNA.budget * 100}%` }}></div>
                </div>
                <span>{Math.round(normalizedDNA.budget * 100)}%</span>
              </div>
              <div className="dna-info">
                <span>Pace: <strong>{normalizedDNA.pace}</strong></span>
              </div>
            </div>
          </div>
        </div>
        <form className="trip-details-form">
          <div className="form-group">
            <label>🌍 Destination *</label>
            <input
              type="text"
              name="destination"
              placeholder={hasValidAPIKey ? "e.g., Paris, France (AI will create detailed itinerary)" : "e.g., Paris, France"}
              value={tripData.destination}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>📅 Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={tripData.startDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="form-group">
              <label>📅 End Date *</label>
              <input
                type="date"
                name="endDate"
                value={tripData.endDate}
                onChange={handleInputChange}
                min={tripData.startDate}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>💰 Budget *</label>
            <select name="budget" value={tripData.budget} onChange={handleInputChange}>
              <option value={25000}>Low (₹25,000)</option>
              <option value={50000}>Medium (₹50,000)</option>
              <option value={100000}>Expensive (₹1,00,000)</option>
            </select>
            <small>Choose your budget range</small>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>👥 Travelers</label>
              <select name="travelers" value={tripData.travelers} onChange={handleInputChange}>
                <option value={1}>1 person</option>
                <option value={2}>2 people</option>
                <option value={3}>3 people</option>
                <option value={4}>4 people</option>
                <option value={5}>5+ people</option>
              </select>
            </div>
            <div className="form-group">
              <label>🏨 Accommodation</label>
              <select name="accommodation" value={tripData.accommodation} onChange={handleInputChange}>
                <option value="budget">Budget Hotel</option>
                <option value="hotel">Mid-range Hotel</option>
                <option value="luxury">Luxury Hotel</option>
                <option value="hostel">Hostel</option>
                <option value="resort">Resort</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>🚗 Transportation</label>
            <select name="transportation" value={tripData.transportation} onChange={handleInputChange}>
              <option value="flight">Flight</option>
              <option value="train">Train</option>
              <option value="bus">Bus</option>
              <option value="car">Car Rental</option>
              <option value="mixed">Mixed Transport</option>
            </select>
          </div>
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
          <button 
            type="button" 
            className="regenerate-btn"
            onClick={generateItineraryWithAI}
            disabled={isGenerating || !tripData.destination || !tripData.startDate || !tripData.endDate}
          >
            {isGenerating ? (
              hasValidAPIKey ? '🤖 AI Generating...' : '⚙️ Generating...'
            ) : (
              hasValidAPIKey ? '🚀 Generate with AI' : '🚀 Generate Itinerary'
            )}
          </button>
        </form>
        
        {/* Cache Status */}
        {cacheStats.count > 0 && (
          <div style={{
            padding: '15px',
            margin: '15px 20px',
            background: 'rgba(40, 167, 69, 0.1)',
            border: '1px solid rgba(40, 167, 69, 0.3)',
            borderRadius: '10px',
            fontSize: '0.85rem'
          }}>
            <div style={{ fontWeight: '600', color: '#28a745', marginBottom: '5px' }}>
              ¾ {cacheStats.count} Cached Destination{cacheStats.count > 1 ? 's' : ''}
            </div>
            <div style={{ color: '#666' }}>
              Recent: {cacheStats.destinations.slice(0, 2).join(', ')}
              {cacheStats.destinations.length > 2 && '...'}
            </div>
          </div>
        )}
      </div>

      {/* Right Side - Generated Itinerary (70%) */}
      <div className="itinerary-section">
        {isGenerating ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h3>{hasValidAPIKey ? '🤖 AI is crafting your perfect itinerary...' : '⚙️ Generating your personalized itinerary...'}</h3>
            <p>Our AI is analyzing your preferences to craft a personalized travel experience</p>
            <div className="loading-steps">
              <div className="step">✅ Processing Travel DNA profile</div>
              <div className="step">✅ Analyzing destination data</div>
              <div className="step">⏳ {hasValidAPIKey ? 'AI generating personalized activities...' : 'Selecting activities...'}</div>
            </div>
          </div>
        ) : generatedItinerary ? (
          <div className="itinerary-content">
            <div className="itinerary-header">
              <h2>🎯 Your Personalized Itinerary</h2>
              {hasValidAPIKey && (
                <div className="ai-generated-badge">
                  ✨ Generated by AI based on your Travel DNA
                </div>
              )}
              {isUsingCache && (
                <div className="cache-status-badge">
                  ⚡ Loaded from cache - No API quota used!
                </div>
              )}
              <div className="trip-overview">
                <div className="overview-item">
                  <span className="label">Destination:</span>
                  <span className="value">{generatedItinerary.destination}</span>
                </div>
                <div className="overview-item">
                  <span className="label">Duration:</span>
                  <span className="value">{generatedItinerary.totalDays} days</span>
                </div>
                <div className="overview-item">
                  <span className="label">Total Cost:</span>
                  <span className="value cost">₹{generatedItinerary.estimatedTotalCost?.toLocaleString('en-IN')}</span>
                </div>
              </div>
              {/* Cost Breakdown */}
              {generatedItinerary.costBreakdown && (
                <div className="cost-breakdown">
                  <h4>💰 Cost Breakdown</h4>
                  <div className="cost-items">
                    <div className="cost-item">
                      <span>🏨 Accommodation</span>
                      <span>₹{generatedItinerary.costBreakdown.accommodation?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="cost-item">
                      <span>🍽️ Food</span>
                      <span>₹{generatedItinerary.costBreakdown.food?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="cost-item">
                      <span>🎯 Activities</span>
                      <span>₹{generatedItinerary.costBreakdown.activities?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="cost-item">
                      <span>🚗 Transportation</span>
                      <span>₹{generatedItinerary.costBreakdown.transportation?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="cost-item">
                      <span>📦 Miscellaneous</span>
                      <span>₹{generatedItinerary.costBreakdown.miscellaneous?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Daily Itinerary */}
            <div className="daily-itinerary">
              <h3>📅 Day-by-Day Itinerary</h3>
              {generatedItinerary.dailyItinerary?.map((day, index) => {
                return (
                <div key={index} className="day-card">
                  <div className="day-header" style={{
                    background: 'linear-gradient(135deg, #ff6b6b 0%, #e55555 100%)',
                    color: 'white',
                    padding: '15px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: '60px'
                  }}>
                    <h4 style={{
                      color: 'white',
                      fontSize: '1.2rem',
                      fontWeight: '600',
                      margin: '0',
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                    }}>
                      Day {day.day} - {day.theme || 'Adventure Day'}
                    </h4>
                    <span style={{
                      color: 'white',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}>
                      {new Date(day.date).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className="day-content">
                    {/* Activities */}
                    <div className="activities-section">
                      <h5>🎯 Activities</h5>
                      {day.activities?.map((activity, actIndex) => {
                        const activityKey = `${index}-${actIndex}`;
                        const status = activityStatuses[activityKey] || 'active';
                        const showAlts = showAlternatives[activityKey];
                        const alternatives = alternativeActivities[activityKey] || [];
                        
                        return (
                          <div key={actIndex} className={`activity-item ${status}`}>
                            <div className="activity-time">{activity.time}</div>
                            <div className="activity-details">
                              <div className="activity-header">
                                <span className="activity-name">{activity.activity}</span>
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
                              <div className="activity-location">📍 {activity.location}</div>
                              <div className="activity-description">{activity.description}</div>
                              <div className="activity-meta">
                                <span className="duration">⏱️ {activity.duration}</span>
                                <span className="cost">💰 ₹{activity.cost?.toLocaleString('en-IN')}</span>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="activity-actions">
                                <button 
                                  className={`action-btn done-btn ${status === 'done' ? 'active' : ''}`}
                                  onClick={() => handleMarkAsDone(index, actIndex)}
                                  title={status === 'done' ? 'Mark as not done' : 'Mark as done'}
                                >
                                  ✅ {status === 'done' ? 'Done' : 'Mark as Done'}
                                </button>
                                
                                <button 
                                  className={`action-btn skip-btn ${status === 'skipped' ? 'active' : ''}`}
                                  onClick={() => handleSkipActivity(index, actIndex)}
                                  title={status === 'skipped' ? 'Reactivate activity' : 'Skip activity'}
                                >
                                  ❌ {status === 'skipped' ? 'Skipped' : 'Skip'}
                                </button>
                                
                                <button 
                                  className={`action-btn alternative-btn ${showAlts ? 'active' : ''}`}
                                  onClick={() => handleSuggestAlternative(index, actIndex)}
                                  title="Suggest alternative activities"
                                >
                                  🔄 Suggest Alternative
                                </button>
                              </div>
                              
                              {/* Alternative Activities Popup */}
                              {showAlts && (
                                <div className="alternatives-popup">
                                  <h6>🔄 Alternative Activities:</h6>
                                  <div className="alternatives-list">
                                    {alternatives.map((alt, altIndex) => (
                                      <div key={altIndex} className="alternative-option">
                                        <div className="alt-activity-info">
                                          <span className="alt-name">{alt.activity}</span>
                                          <div className="alt-meta">
                                            <span className="alt-duration">⏱️ {alt.duration}</span>
                                            <span className="alt-cost">💰 ₹{alt.cost?.toLocaleString('en-IN')}</span>
                                          </div>
                                        </div>
                                        <button 
                                          className="select-alt-btn"
                                          onClick={() => handleSelectAlternative(index, actIndex, alt)}
                                        >
                                          Select
                                        </button>
                                        <button 
                                          className="accept-alt-btn"
                                          onClick={() => handleAcceptAlternative(index, actIndex, alt)}
                                        >
                                          Accept
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <button 
                                    className="close-alternatives-btn"
                                    onClick={() => handleSuggestAlternative(index, actIndex)}
                                  >
                                    Close
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Meals */}
                    {day.meals && (
                      <div className="meals-section">
                        <h5>🍽️ Meals</h5>
                        {day.meals.map((meal, mealIndex) => (
                          <div key={mealIndex} className="meal-item">
                            <span className="meal-type">{meal.type}</span>
                            <span className="meal-details">
                              {meal.restaurant} - {meal.cuisine}
                            </span>
                            <span className="meal-cost">₹{meal.cost?.toLocaleString('en-IN')}</span>
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
                          <span className="accommodation-location">📍 {day.accommodation.location}</span>
                          <span className="accommodation-cost">₹{day.accommodation.cost?.toLocaleString('en-IN')}/night</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
              })}
            </div>

            {/* Recommendations */}
            {generatedItinerary.recommendations && (
              <div className="recommendations-section">
                <h3>💡 Travel Recommendations</h3>
                
                <div className="recommendation-grid">
                  <div className="recommendation-card">
                    <h4>🌍 Best Time to Visit</h4>
                    <p>{generatedItinerary.recommendations.bestTimeToVisit}</p>
                  </div>
                  <div className="recommendation-card">
                    <h4>💡 Local Tips</h4>
                    <ul>
                      {generatedItinerary.recommendations.localTips?.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="recommendation-card">
                    <h4>🎒 Packing List</h4>
                    <ul>
                      {generatedItinerary.recommendations.packingList?.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="recommendation-card">
                    <h4>🙏 Cultural Etiquette</h4>
                    <ul>
                      {generatedItinerary.recommendations.culturalEtiquette?.map((rule, index) => (
                        <li key={index}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="itinerary-actions">
              <button 
                className="save-itinerary-btn" 
                onClick={() => handleSaveItinerary(tripData.startDate, tripData.endDate)}
                disabled={isSaving}
              >
                {isSaving ? '💾 Saving...' : '💾 Save Itinerary'}
              </button>
              <button 
                className="share-itinerary-btn" 
                onClick={handleShareItinerary}
              >
                📤 Share with Friends
              </button>
              <button 
                className="export-pdf-btn" 
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                {isExporting ? '📄 Exporting...' : '📄 Export as PDF'}
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <h3>Ready to plan your adventure?</h3>
            <p>Fill in your trip details on the left to get started with AI-powered itinerary generation!</p>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📤 Share Your Itinerary</h3>
              <button className="modal-close" onClick={() => setShowShareModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Your itinerary has been saved and a shareable link has been created!</p>
              <div className="share-link-container">
                <input 
                  type="text" 
                  value={shareableLink} 
                  readOnly 
                  className="share-link-input"
                />
                <button 
                  className="copy-link-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(shareableLink);
                    alert('Link copied to clipboard!');
                  }}
                >
                  📋 Copy
                </button>
              </div>
              <div className="share-options">
                <p>Share via:</p>
                <div className="share-buttons">
                  <a 
                    href={`https://wa.me/?text=Check out my travel itinerary: ${shareableLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn whatsapp"
                  >
                    📱 WhatsApp
                  </a>
                  <a 
                    href={`mailto:?subject=My Travel Itinerary&body=Check out my travel itinerary: ${shareableLink}`}
                    className="share-btn email"
                  >
                    📧 Email
                  </a>
                  <a 
                    href={`https://twitter.com/intent/tweet?text=Check out my travel itinerary: ${shareableLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn twitter"
                  >
                    🐦 Twitter
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPlanningPage;