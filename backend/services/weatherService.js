// backend/services/weatherService.js
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

// Weather service using Open-Meteo (no API key required)
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const cache = new Map();

function buildCacheKey(destination, startDate, endDate) {
  return `${destination.toLowerCase().trim()}|${startDate}|${endDate}`;
}

/**
 * Robust normalizeDate:
 * - Accepts Date, "YYYY-MM-DD", "DD/MM/YYYY", or other ISO-like
 * - Returns a Date or null
 */
function normalizeDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;

  if (typeof val === 'string') {
    const s = val.trim();

    // 1) YYYY-MM-DD -> treat as year-first (HTML date input)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(s + 'T00:00:00Z');
      return isNaN(d) ? null : d;
    }

    // 2) DD/MM/YYYY -> treat as day-first
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('/');
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      return isNaN(d) ? null : d;
    }

    // 3) Fallback: let JS try
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  // Fallback for unexpected types
  const d = new Date(val);
  return isNaN(d) ? null : d;
}

/**
 * Clamp requested trip dates into Open-Meteo's forecast window.
 * Open-Meteo only gives ~16 days ahead; past dates can cause 400.
 */
function clampToForecastWindow(startDate, endDate) {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  if (!start || !end) {
    console.warn('[Weather] Invalid dates passed into clampToForecastWindow:', startDate, endDate);
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxForecast = new Date(today);
  maxForecast.setDate(maxForecast.getDate() + 16); // Open-Meteo forecast horizon

  // If whole trip is before today OR completely after maxForecast -> no forecast
  if (end < today || start > maxForecast) {
    console.log('[Weather] Trip is outside Open-Meteo forecast window. Skipping weather fetch.');
    return null;
  }

  // Clamp inside [today, maxForecast]
  const clampedStart = start < today ? today : start;
  const clampedEnd = end > maxForecast ? maxForecast : end;

  const fmt = (d) => d.toISOString().slice(0, 10);
  return {
    startDate: fmt(clampedStart),
    endDate: fmt(clampedEnd),
  };
}

/**
 * 🌏 Geocode destination with **India-biased** lookup.
 * Prefer results where country_code === "IN" or country === "India".
 */
async function geocodeDestination(destination) {
  const raw = String(destination || '').trim();
  const baseCity = raw.split(',')[0].trim();

  // We strongly prefer India for your use-case
  const queries = [];
  const pushQ = (q) => {
    const s = String(q || '').trim();
    if (s && !queries.includes(s)) queries.push(s);
  };

  // Try most India-specific variants FIRST
  pushQ(`${baseCity}, India`);
  pushQ(`${raw}, India`);
  pushQ(raw);
  pushQ(baseCity);

  const buildUrl = (name) =>
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      name
    )}&count=10&language=en&format=json`;

  console.log('[Geocoding] Trying queries (India-biased):', queries);

  let lastError = null;

  for (const q of queries) {
    try {
      const res = await fetch(buildUrl(q));
      if (!res.ok) {
        lastError = new Error(`Geocoding failed with status: ${res.status}`);
        console.error('[Geocoding] HTTP error for query:', q, res.status);
        continue;
      }

      const data = await res.json();
      const results = data?.results || [];

      if (!results.length) {
        console.log('[Geocoding] No results for query:', q);
        continue;
      }

      // 👉 Prefer India result if available
      let result =
        results.find(
          (r) =>
            r.country_code === 'IN' ||
            r.country === 'India'
        ) || results[0];

      console.log('[Geocoding] Picked result for query:', q, result);

      return {
        latitude: parseFloat(result.latitude),
        longitude: parseFloat(result.longitude),
        name: result.name,
        country: result.country,
        timezone: result.timezone || 'Asia/Kolkata', // sensible default for India
      };
    } catch (e) {
      console.error('[Geocoding] Network error for query:', q, e);
      lastError = e;
    }
  }

  console.error(
    `[Geocoding] All queries failed or returned no usable results for destination: ${destination}`
  );
  throw lastError || new Error(`Destination not found for geocoding: ${destination}`);
}

function weatherCodeToSummaryIcon(code) {
  const mapping = [
    { codes: [0], summary: 'Clear sky', icon: 'clear' },
    { codes: [1, 2], summary: 'Partly cloudy', icon: 'partly-cloudy' },
    { codes: [3], summary: 'Overcast', icon: 'cloudy' },
    { codes: [45, 48], summary: 'Fog', icon: 'fog' },
    { codes: [51, 53, 55], summary: 'Drizzle', icon: 'drizzle' },
    { codes: [61, 63, 65], summary: 'Rain', icon: 'rain' },
    { codes: [80, 81, 82], summary: 'Rain showers', icon: 'showers' },
    { codes: [95, 96, 99], summary: 'Thunderstorm', icon: 'thunder' },
  ];
  return (
    mapping.find((m) => m.codes.includes(code)) || {
      summary: 'Cloudy',
      icon: 'cloudy',
    }
  );
}

/**
 * Low-level Open-Meteo call.
 * IMPORTANT: does NOT throw on non-200; returns empty forecast instead
 */
async function fetchOpenMeteoForecast({
  latitude,
  longitude,
  startDate,
  endDate,
  timezone = 'auto',
}) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone,
    start_date: startDate,
    end_date: endDate,
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  console.log('[Weather] Open-Meteo URL:', url);

  try {
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(
        `[Weather] Forecast fetch failed: ${res.status} ${res.statusText} | body:`,
        body
      );
      // Do NOT throw – just return empty forecast so trip still saves
      return { byDate: {}, timezone };
    }

    const data = await res.json();
    const d = data?.daily;
    if (!d?.time) return { byDate: {}, timezone: data?.timezone || timezone };

    const byDate = {};
    d.time.forEach((dateStr, i) => {
      const code = Number(d.weather_code?.[i] ?? NaN);
      const { summary, icon } = weatherCodeToSummaryIcon(code);
      byDate[dateStr] = {
        date: dateStr,
        summary,
        icon,
        tempMinC: d.temperature_2m_min?.[i] ?? null,
        tempMaxC: d.temperature_2m_max?.[i] ?? null,
        precipitationChance:
          (d.precipitation_probability_max?.[i] ?? null) !== null
            ? Number(d.precipitation_probability_max?.[i]) / 100
            : null,
        provider: 'open-meteo',
        timezone: data?.timezone || timezone,
      };
    });
    return { byDate, timezone: data?.timezone || timezone };
  } catch (err) {
    console.error('[Weather] Network/parse error in fetchOpenMeteoForecast:', err);
    // Again, never block trip creation
    return { byDate: {}, timezone };
  }
}

/**
 * High-level API used by server.js
 */
export async function getForecastForTrip({ destination, startDate, endDate }) {
  // Normalize incoming dates from frontend
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  if (!start || !end) {
    console.warn('[Weather] Invalid dates for getForecastForTrip:', startDate, endDate);
    return { byDate: {}, timezone: null, location: null, reason: 'invalid_dates' };
  }

  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);

  console.log('[Weather] Incoming trip dates:', {
    rawStart: startDate,
    rawEnd: endDate,
    normalizedStart: startIso,
    normalizedEnd: endIso,
  });

  // Clamp to forecast window (today .. today+16)
  const clamped = clampToForecastWindow(startIso, endIso);
  if (!clamped) {
    // Entire trip is out of forecast range – just return "no data"
    console.log('[Weather] Trip is outside Open-Meteo forecast window. Skipping weather fetch.');
    return { byDate: {}, timezone: null, location: null, reason: 'out_of_forecast_range' };
  }

  const { startDate: forecastStart, endDate: forecastEnd } = clamped;
  const key = buildCacheKey(destination, forecastStart, forecastEnd);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    console.log('[Weather] Using cached data for:', destination);
    return cached.data;
  }

  console.log('[Weather] Using Open-Meteo (no key required)');
  const geo = await geocodeDestination(destination);

  const { byDate, timezone } = await fetchOpenMeteoForecast({
    latitude: geo.latitude,
    longitude: geo.longitude,
    startDate: forecastStart,
    endDate: forecastEnd,
    timezone: geo.timezone || 'auto',
  });

  const result = { byDate, timezone, location: geo };
  cache.set(key, { data: result, expiresAt: now + CACHE_TTL_MS });
  return result;
}

/**
 * Attach forecast data to each day in the itinerary (mutates clone)
 */
export function attachWeatherToItinerary(itinerary, forecast) {
  if (!itinerary?.dailyItinerary?.length || !forecast?.byDate) return itinerary;

  const normalizeDateKey = (val) => {
    if (!val) return null;
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    return !isNaN(d) ? d.toISOString().slice(0, 10) : null;
  };

  const updated = {
    ...itinerary,
    dailyItinerary: itinerary.dailyItinerary.map((d) => ({ ...d })),
  };

  updated.dailyItinerary.forEach((day) => {
    const dateKey = normalizeDateKey(day.date);
    if (dateKey && forecast.byDate[dateKey]) {
      day.weather = forecast.byDate[dateKey];
    }
  });
  return updated;
}
