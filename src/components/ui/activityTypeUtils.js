// Utility functions to normalize activity types and provide icon/label

// Keyword maps to help infer type from names/descriptions
const KEYWORDS = {
  adventure: [
    'trek', 'hike', 'climb', 'adventure', 'rafting', 'dive', 'diving', 'zip', 'zipline', 'kayak', 'bike', 'biking', 'cycle', 'cycling', 'bungee', 'mountain', 'rock', 'skydive'
  ],
  foodie: [
    'food', 'cook', 'cooking', 'market', 'restaurant', 'taste', 'tasting', 'wine', 'cheese', 'ramen', 'sushi', 'dine', 'dining', 'street food', 'cuisine'
  ],
  relaxation: [
    'spa', 'relax', 'relaxation', 'beach', 'yoga', 'meditation', 'garden', 'cruise', 'massage', 'wellness', 'sunset'
  ],
  culture: [
    'museum', 'temple', 'heritage', 'historical', 'history', 'art', 'gallery', 'cathedral', 'opera', 'palace', 'walk', 'walking tour', 'tour', 'performance', 'shrine'
  ]
};

const VALID_TYPES = ['adventure', 'culture', 'foodie', 'relaxation'];

function toLowerSafe(v) {
  return String(v || '').trim().toLowerCase();
}

function matchByKeywords(text) {
  const t = toLowerSafe(text);
  if (!t) return null;
  // Priority: adventure/foodie/relaxation, fallback culture
  for (const type of ['adventure', 'foodie', 'relaxation', 'culture']) {
    const list = KEYWORDS[type];
    if (list && list.some(k => t.includes(k))) return type;
  }
  return null;
}

// Normalize mapped values and synonyms
function mapSynonym(t) {
  const s = toLowerSafe(t);
  if (!s) return '';
  if (s === 'adventurous' || s === 'outdoor' || s === 'active' || s === 'sports') return 'adventure';
  if (s === 'cultural' || s === 'heritage' || s === 'arts') return 'culture';
  if (s === 'food' || s === 'culinary' || s === 'dining' || s === 'cuisine') return 'foodie';
  if (s === 'relax' || s === 'wellness' || s === 'leisure') return 'relaxation';
  return s;
}

// Primary normalizer: accepts an activity object or a raw type/category string
export function normalizeActivityType(activityOrType) {
  // If a string is passed, treat it as a type/category
  if (typeof activityOrType === 'string') {
    const t = mapSynonym(activityOrType);
    return VALID_TYPES.includes(t) ? t : 'culture';
  }

  const a = activityOrType || {};
  // Prefer explicit type/category
  let t = mapSynonym(a.type || a.category);
  if (VALID_TYPES.includes(t)) return t;

  // Infer from activity name/description
  const inferred = matchByKeywords(a.activity || a.name || a.description);
  if (VALID_TYPES.includes(inferred)) return inferred;

  // Safe default to avoid misleading relaxation catch-all
  return 'culture';
}

export function getActivityTypeIcon(type) {
  const t = normalizeActivityType(type);
  return t === 'adventure' ? '🏔️'
    : t === 'culture' ? '🏛️'
    : t === 'foodie' ? '🍽️'
    : '🧘';
}

export function getActivityTypeLabel(type) {
  const t = normalizeActivityType(type);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function getActivityTypeClass(type) {
  return normalizeActivityType(type);
}