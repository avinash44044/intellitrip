import axios from 'axios';
import { API_CONFIG } from '../config/apiConfig';

// Amadeus API configuration
const AMADEUS_API_KEY = API_CONFIG.AMADEUS.API_KEY;
const AMADEUS_API_SECRET = API_CONFIG.AMADEUS.API_SECRET;
const AMADEUS_BASE_URL = API_CONFIG.AMADEUS.BASE_URL;
const AMADEUS_ENABLED = API_CONFIG.AMADEUS.ENABLED;

class FlightService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get access token from Amadeus
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
        grant_type: 'client_credentials',
        client_id: AMADEUS_API_KEY,
        client_secret: AMADEUS_API_SECRET
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  // Search for flights using Amadeus API
  async searchFlights(searchParams) {
    // Check if real API is enabled and configured
    if (!AMADEUS_ENABLED || AMADEUS_API_KEY === 'YOUR_AMADEUS_API_KEY_HERE') {
      console.log('Using mock flight data. Configure API keys in src/config/apiConfig.js for real data.');
      return this.getMockFlights(searchParams);
    }

    try {
      const token = await this.getAccessToken();
      
      const params = {
        originLocationCode: this.getAirportCode(searchParams.from),
        destinationLocationCode: this.getAirportCode(searchParams.to),
        departureDate: searchParams.departDate,
        adults: searchParams.passengers,
        max: 10
      };

      if (searchParams.returnDate && searchParams.tripType === 'roundtrip') {
        params.returnDate = searchParams.returnDate;
      }

      const response = await axios.get(`${AMADEUS_BASE_URL}/v2/shopping/flight-offers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params
      });

      return this.formatFlightData(response.data.data);
    } catch (error) {
      console.error('Error searching flights:', error);
      // Fallback to mock data if API fails
      return this.getMockFlights(searchParams);
    }
  }

  // Format Amadeus API response to our format
  formatFlightData(flightOffers) {
    return flightOffers.map((offer, index) => {
      const outbound = offer.itineraries[0];
      const firstSegment = outbound.segments[0];
      const lastSegment = outbound.segments[outbound.segments.length - 1];

      return {
        id: index + 1,
        airline: this.getAirlineName(firstSegment.carrierCode),
        flightNumber: `${firstSegment.carrierCode}${firstSegment.number}`,
        departure: {
          airport: firstSegment.departure.iataCode,
          time: new Date(firstSegment.departure.at).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          date: new Date(firstSegment.departure.at).toLocaleDateString()
        },
        arrival: {
          airport: lastSegment.arrival.iataCode,
          time: new Date(lastSegment.arrival.at).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          date: new Date(lastSegment.arrival.at).toLocaleDateString()
        },
        duration: outbound.duration.replace('PT', '').toLowerCase(),
        price: Math.round(parseFloat(offer.price.total)),
        stops: outbound.segments.length - 1,
        aircraft: lastSegment.aircraft?.code || 'N/A',
        bookingUrl: this.generateBookingUrl(offer, firstSegment),
        deepLink: offer.id
      };
    });
  }

  // Generate booking URLs for different airlines/booking sites
  generateBookingUrl(offer, segment) {
    const departure = segment.departure.iataCode;
    const arrival = segment.arrival.iataCode;
    const date = segment.departure.at.split('T')[0];
    
    // Generate URLs for popular booking sites
    const bookingUrls = {
      expedia: `https://www.expedia.com/Flights-Search?trip=oneway&leg1=from:${departure},to:${arrival},departure:${date}`,
      kayak: `https://www.kayak.com/flights/${departure}-${arrival}/${date}`,
      skyscanner: `https://www.skyscanner.com/transport/flights/${departure}/${arrival}/${date.replace(/-/g, '')}`,
      booking: `https://www.booking.com/flights/search?type=ONEWAY&from=${departure}&to=${arrival}&depart=${date}`,
      momondo: `https://www.momondo.com/flight-search/${departure}-${arrival}/${date}`
    };

    return bookingUrls;
  }

  // Get airline name from code
  getAirlineName(code) {
    const airlines = {
      'AA': 'American Airlines',
      'DL': 'Delta Air Lines',
      'UA': 'United Airlines',
      'EK': 'Emirates',
      'QR': 'Qatar Airways',
      'TK': 'Turkish Airlines',
      'LH': 'Lufthansa',
      'BA': 'British Airways',
      'AF': 'Air France',
      'KL': 'KLM',
      'SQ': 'Singapore Airlines',
      'CX': 'Cathay Pacific'
    };
    return airlines[code] || code;
  }

  // Simple airport code mapping (in production, use a proper airport database)
  getAirportCode(cityName) {
    const cityToAirport = {
      'new york': 'JFK',
      'nyc': 'JFK',
      'london': 'LHR',
      'paris': 'CDG',
      'tokyo': 'NRT',
      'dubai': 'DXB',
      'singapore': 'SIN',
      'hong kong': 'HKG',
      'los angeles': 'LAX',
      'chicago': 'ORD',
      'miami': 'MIA',
      'toronto': 'YYZ',
      'sydney': 'SYD',
      'mumbai': 'BOM',
      'delhi': 'DEL',
      'bangkok': 'BKK',
      'istanbul': 'IST',
      'amsterdam': 'AMS',
      'frankfurt': 'FRA',
      'zurich': 'ZUR'
    };
    
    return cityToAirport[cityName.toLowerCase()] || cityName.toUpperCase().substring(0, 3);
  }

  // Fallback mock data when API is not available
  getMockFlights(searchData) {
    const mockFlights = [
      {
        id: 1,
        airline: 'Emirates',
        flightNumber: 'EK205',
        departure: {
          airport: this.getAirportCode(searchData.from),
          time: '08:30',
          date: searchData.departDate
        },
        arrival: {
          airport: this.getAirportCode(searchData.to),
          time: '14:45',
          date: searchData.departDate
        },
        duration: '6h 15m',
        price: 850,
        stops: 0,
        aircraft: 'Boeing 777',
        bookingUrl: this.generateMockBookingUrl(searchData)
      },
      {
        id: 2,
        airline: 'Qatar Airways',
        flightNumber: 'QR123',
        departure: {
          airport: this.getAirportCode(searchData.from),
          time: '11:20',
          date: searchData.departDate
        },
        arrival: {
          airport: this.getAirportCode(searchData.to),
          time: '18:30',
          date: searchData.departDate
        },
        duration: '7h 10m',
        price: 720,
        stops: 1,
        aircraft: 'Airbus A350',
        bookingUrl: this.generateMockBookingUrl(searchData)
      },
      {
        id: 3,
        airline: 'Turkish Airlines',
        flightNumber: 'TK456',
        departure: {
          airport: this.getAirportCode(searchData.from),
          time: '15:45',
          date: searchData.departDate
        },
        arrival: {
          airport: this.getAirportCode(searchData.to),
          time: '22:15',
          date: searchData.departDate
        },
        duration: '6h 30m',
        price: 650,
        stops: 0,
        aircraft: 'Boeing 787',
        bookingUrl: this.generateMockBookingUrl(searchData)
      }
    ];

    return mockFlights;
  }

  generateMockBookingUrl(searchData) {
    const departure = this.getAirportCode(searchData.from);
    const arrival = this.getAirportCode(searchData.to);
    const date = searchData.departDate;
    
    return {
      expedia: `https://www.expedia.com/Flights-Search?trip=oneway&leg1=from:${departure},to:${arrival},departure:${date}`,
      kayak: `https://www.kayak.com/flights/${departure}-${arrival}/${date}`,
      skyscanner: `https://www.skyscanner.com/transport/flights/${departure}/${arrival}/${date.replace(/-/g, '')}`,
      booking: `https://www.booking.com/flights/search?type=ONEWAY&from=${departure}&to=${arrival}&depart=${date}`,
      momondo: `https://www.momondo.com/flight-search/${departure}-${arrival}/${date}`
    };
  }
}

export const flightService = new FlightService();