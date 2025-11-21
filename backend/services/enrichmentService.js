import dotenv from 'dotenv';
dotenv.config();

// Enrichment service for itinerary places: map previews, ratings, crowd level, events
// - Map preview: Google Maps search URL (no key), optional Google Static Maps image (if key present)
// - Rating: Google Places rating if API key provided; else lightweight proxy heuristic
// - Crowd Level: rule-based using rating, weekend/weekday, weather summary/icon, and event presence
// - Events: minimal curated festival hotspots for major Indian cities by month windows
// Uses global fetch (Node 18+)
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const GOOGLE_STATIC_MAPS_API_KEY = process.env.GOOGLE_STATIC_MAPS_API_KEY || '';

// Debug: init flags (no secrets)
console.log('EnrichmentService init:', {
  hasPlaces: !!GOOGLE_PLACES_API_KEY,
  hasStaticMaps: !!GOOGLE_STATIC_MAPS_API_KEY
});

// --- Helpers ---
const toYMD = (val) => {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
};

const isWeekend = (ymd) => {
  const d = new Date(ymd);
  const day = d.getUTCDay ? d.getUTCDay() : d.getDay();
  return day === 0 || day === 6; // Sun or Sat
};

const classifyWeather = (weather) => {
  const icon = (weather?.icon || '').toLowerCase();
  const summary = (weather?.summary || '').toLowerCase();
  const precip = (typeof weather?.precipitationChance === 'number') ? weather.precipitationChance : null; // 0..1
  // Only mark rainy when we also have a meaningful precip probability
  if (precip !== null) {
    if ((icon.includes('thunder') || summary.includes('thunder')) && precip >= 0.2) return 'rainy';
    if ((icon.includes('rain') || icon.includes('drizzle') || summary.includes('rain')) && precip >= 0.4) return 'rainy';
  }
  if (icon.includes('clear') || summary.includes('sun') || summary.includes('clear')) return 'sunny';
  return 'cloudy';
};

const buildMapsUrl = (place, destination) => {
  const query = [place, destination].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

const buildStaticMapUrl = (place, destination) => {
  if (!GOOGLE_STATIC_MAPS_API_KEY) return null;
  const marker = encodeURIComponent([place, destination].filter(Boolean).join(', '));
  const params = new URLSearchParams({
    size: '600x300',
    scale: '2',
    zoom: '14',
    markers: `color:red|${marker}`,
    key: GOOGLE_STATIC_MAPS_API_KEY
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
};

const tryFetchPlaceRating = async (place, destination) => {
  if (!GOOGLE_PLACES_API_KEY) return null;
  try {
    // Use Places Text Search to get rating quickly
    const query = [place, destination].filter(Boolean).join(', ');
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const first = data?.results?.[0];
    if (first && typeof first.rating === 'number') {
      return { rating: first.rating, ratingCount: first.user_ratings_total || undefined, placeId: first.place_id };
    }
  } catch (_) {
    // ignore
  }
  return null;
};

const proxyRatingHeuristic = (activity) => {
  // Lightweight proxy when no Places access
  // Signals for higher appeal
  const text = `${activity?.activity || ''} ${activity?.description || ''}`.toLowerCase();
  const boostWords = ['famous', 'popular', 'must-see', 'iconic', 'heritage', 'fort', 'temple', 'museum', 'beach', 'park'];
  const hits = boostWords.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
  // Base 4.1, add 0.1 per hit up to 4.7
  const rating = Math.min(4.7, 4.1 + 0.1 * hits);
  return { rating, ratingCount: undefined, placeId: undefined };
};

const withinMonthWindow = (ymd, months) => {
  const d = new Date(ymd);
  const m = d.getUTCMonth() + 1; // 1..12
  return months.includes(m);
};

const normalizeCity = (destination) => {
  if (!destination) return '';
  const city = destination.split(',')[0].trim().toLowerCase();
  // map known aliases
  if (city === 'bombay') return 'mumbai';
  return city;
};

const curatedFestivalWindows = {
  // month windows (approx) for major festivals
  mumbai: [8, 9], // Ganesh Chaturthi Aug/Sep
  chennai: [1], // Pongal Jan
  delhi: [10, 11], // Diwali Oct/Nov
  kolkata: [10], // Durga Puja Oct
  jaipur: [1], // Jaipur Lit Fest Jan
  varanasi: [11], // Dev Deepawali Nov
  bengaluru: [9, 10], // Dasara Sep/Oct
  bangalore: [9, 10],
};

const curatedFestivalDetails = {
  mumbai: [{ name: 'Ganesh Chaturthi Festivities', url: 'https://en.wikipedia.org/wiki/Ganesh_Chaturthi' }],
  chennai: [{ name: 'Pongal Celebrations', url: 'https://en.wikipedia.org/wiki/Thai_Pongal' }],
  delhi: [{ name: 'Diwali Events', url: 'https://en.wikipedia.org/wiki/Diwali' }],
  kolkata: [{ name: 'Durga Puja Pandals', url: 'https://en.wikipedia.org/wiki/Durga_Puja' }],
  jaipur: [{ name: 'Jaipur Literature Festival', url: 'https://jaipurliteraturefestival.org/' }],
  varanasi: [{ name: 'Dev Deepawali on the Ghats', url: 'https://en.wikipedia.org/wiki/Dev_Deepavali' }],
  bengaluru: [{ name: 'Dasara Festivities', url: 'https://en.wikipedia.org/wiki/Dussehra' }],
  bangalore: [{ name: 'Dasara Festivities', url: 'https://en.wikipedia.org/wiki/Dussehra' }],
};

const deriveCrowdLevel = ({ isWeekendDay, weatherType, rating, hasEvents }) => {
  const highRating = rating >= 4.4;
  const medRating = rating >= 4.0 && rating < 4.4;
  // Rules
  if ((isWeekendDay && weatherType === 'sunny' && highRating) || (hasEvents && (isWeekendDay || weatherType === 'sunny'))) {
    return 'High';
  }
  if (weatherType === 'rainy' && !hasEvents) {
    return 'Low';
  }
  if (isWeekendDay && medRating) {
    return weatherType === 'sunny' ? 'High' : 'Medium';
  }
  return 'Medium';
};

export async function enrichItinerary(itinerary, destination) {
  if (!itinerary?.dailyItinerary?.length) return itinerary;
  const cityKey = normalizeCity(itinerary?.destination || destination);
  const festMonths = curatedFestivalWindows[cityKey] || [];
  const festDetails = curatedFestivalDetails[cityKey] || [];
  const enriched = { ...itinerary };
  enriched.dailyItinerary = await Promise.all((itinerary.dailyItinerary || []).map(async (day) => {
    const ymd = toYMD(day.date);
    const isWeekendDay = isWeekend(ymd);
    const weatherType = classifyWeather(day.weather);
    const isFestMonth = ymd ? withinMonthWindow(ymd, festMonths) : false;
    const activities = await Promise.all((day.activities || []).map(async (act) => {
      const mapsUrl = buildMapsUrl(act.location || act.activity, destination || itinerary?.destination);
      const staticMapUrl = buildStaticMapUrl(act.location || act.activity, destination || itinerary?.destination);
      // Try Places API; fallback to proxy heuristic
      let placeMeta = null;
      try {
        if (GOOGLE_PLACES_API_KEY) {
          console.log('[Places] fetching rating for:', act.location || act.activity, 'in', destination || itinerary?.destination);
        }
        placeMeta = await tryFetchPlaceRating(act.location || act.activity, destination || itinerary?.destination);
        if (placeMeta) {
          console.log('[Places] got rating:', { rating: placeMeta.rating, count: placeMeta.ratingCount });
        } else if (GOOGLE_PLACES_API_KEY) {
          console.log('[Places] no result for query');
        }
      } catch (e) {
         console.warn('[Places] fetch error:', e?.message || e);
      }
      if (!placeMeta) {
        placeMeta = proxyRatingHeuristic(act);
      }
      // Events near-by for festival months (coarse)
      const events = [];
      if (isFestMonth && festDetails.length) {
        festDetails.forEach((e) => {
          events.push({
            name: e.name,
            startDate: ymd || undefined,
            endDate: ymd || undefined,
            url: e.url,
            distanceKm: undefined,
          });
        });
      }
      const hasEvents = events.length > 0;
      const crowdLevel = deriveCrowdLevel({
        isWeekendDay,
        weatherType,
        rating: placeMeta.rating ?? 4.2,
        hasEvents,
      });
      const reasons = [];
      if (isWeekendDay) reasons.push('Weekend');
      if (weatherType === 'sunny') reasons.push('Sunny');
      if (weatherType === 'rainy') reasons.push('Rainy');
      if ((placeMeta.rating ?? 4.2) >= 4.4) reasons.push('High rating');
      if (hasEvents) reasons.push('Nearby festival/event');
      return {
        ...act,
        placeId: placeMeta.placeId,
        rating: placeMeta.rating,
        ratingCount: placeMeta.ratingCount,
        map: {
          mapsUrl,
          staticMapUrl: staticMapUrl || undefined,
          placeUrl: placeMeta.placeId ? `https://www.google.com/maps/place/?q=place_id:${placeMeta.placeId}` : undefined,
        },
        crowd: {
          level: crowdLevel,
          reasons,
        },
        events,
      };
    }));
    return { ...day, activities };
  }));
  return enriched;
}