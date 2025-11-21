// API Configuration
// To use real flight data, sign up for Amadeus API at: https://developers.amadeus.com/
// and replace the placeholder values below with your actual API credentials

export const API_CONFIG = {
  // Amadeus API Configuration
  AMADEUS: {
    API_KEY: 'YOUR_AMADEUS_API_KEY_HERE',
    API_SECRET: 'YOUR_AMADEUS_API_SECRET_HERE',
    BASE_URL: 'https://test.api.amadeus.com', // Use https://api.amadeus.com for production
    ENABLED: false // Set to true when you have valid API credentials
  },
  
  // Alternative APIs (for future implementation)
  SKYSCANNER: {
    API_KEY: 'YOUR_SKYSCANNER_API_KEY_HERE',
    ENABLED: false
  },
  
  KAYAK: {
    API_KEY: 'YOUR_KAYAK_API_KEY_HERE',
    ENABLED: false
  }
};

// Instructions for getting API keys:
/*
1. Amadeus API (Recommended - Free tier available):
   - Visit: https://developers.amadeus.com/
   - Sign up for a free account
   - Create a new app to get your API Key and Secret
   - Replace the placeholder values above
   - Set ENABLED to true

2. Skyscanner API:
   - Visit: https://rapidapi.com/skyscanner/api/skyscanner-flight-search/
   - Subscribe to get API access
   - Replace the API key above

3. Kayak API:
   - Contact Kayak for API access
   - This is typically for enterprise customers

Note: The app will use mock data when no real API is configured.
*/