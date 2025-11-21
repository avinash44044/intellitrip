import React, { useEffect, useMemo, useRef, useState } from 'react';
import { tripAPI, travelDNAAPI } from '../services/api';
import './TripPlanningPage.css';

// Card for a single itinerary in the Popular Preplanned Itineraries section
const ItineraryCard = ({ itinerary, compat, onView, onClone, cloningId }) => {
  return (
    <div className='trip-card' style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className='trip-header' style={{ marginBottom: 0 }}>
        <h3>{itinerary.destination}</h3>
        <div className='trip-length'>{itinerary?.itinerary?.totalDays ?? '-'} days</div>
        {typeof compat === 'number' && (
          <div style={{ marginTop: 4, fontSize: 12, color: '#0b8457', fontWeight: 600 }}>Match {compat}%</div>
        )}
      </div>
      <div className='trip-actions' style={{ marginTop: 'auto', display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <button className='open-trip-btn' style={{ flex: '0 0 auto' }} onClick={() => onView(itinerary)}>🔍 View</button>
        <button className='complete-trip-btn' style={{ flex: '0 0 auto' }} disabled={cloningId === itinerary._id} onClick={() => onClone(itinerary)}>
          {cloningId === itinerary._id ? 'Adding...' : '➕ Add'}
        </button>
      </div>
    </div>
  );
};

// Modal for viewing full itinerary details (no new buttons added)
const DetailsModal = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div className='trip-preview-modal'>
      <div className='modal-overlay' onClick={onClose}></div>
      <div className='modal-content trip-preview-content' style={{ maxWidth: 900 }}>
        <div className='modal-header'>
          <h2>Itinerary: {item.destination}</h2>
          <button className='close-modal' onClick={onClose}>×</button>
        </div>
        <div className='trip-overview'>
          <div className='trip-header'>
            <h3>{item.destination}</h3>
            <div className='trip-duration'>{item?.itinerary?.totalDays ?? '-'} days</div>
            <div className='estimated-cost'>Estimated Cost: ₹{item?.itinerary?.estimatedTotalCost?.toLocaleString('en-IN')}</div>
          </div>

          <div className='itinerary-section'>
            <h4>Daily Itinerary</h4>
            {(item?.itinerary?.dailyItinerary || []).map((day, idx) => (
              <div key={idx} className='day-card'>
                <div className='day-header'>
                  <h5>Day {day.day} - {day.theme}</h5>
                </div>
                <div className='day-activities'>
                  {(day.activities || []).map((a, j) => (
                    <div className='activity-item' key={j}>
                      <div className='activity-time'>{a.time}</div>
                      <div className='activity-details'>
                        <div className='activity-name'>{a.activity}</div>
                        <div className='activity-meta'>
                          <span className={`activity-type ${a.type}`}>{a.type}</span>
                          {a.duration && <span className='activity-duration'>{a.duration}</span>}
                          {a.cost != null && <span className='activity-cost'>₹{a.cost}</span>}
                          {a.rating != null && <span className='activity-rating'>⭐ {a.rating}</span>}
                          {a.crowd?.level && <span className='activity-crowd'>👥 {a.crowd.level}</span>}
                          {a.map?.mapsUrl && (
                            <a href={a.map.mapsUrl} target='_blank' rel='noreferrer' className='activity-map'>🗺️ Map</a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const PreplannedItineraries = ({ onBack, hideHeader = false, hideSearch = false }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [cloningId, setCloningId] = useState(null);
  const [dna, setDna] = useState(null);

  // Date selection for cloning
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [pendingCloneTripId, setPendingCloneTripId] = useState(null);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [dateError, setDateError] = useState('');

  // Carousel state
  const [pageIndex, setPageIndex] = useState(0);
  const viewportRef = useRef(null);

  // Fetch user Travel DNA once to enable personalization
  useEffect(() => {
    (async () => {
      try {
        const res = await travelDNAAPI.getTravelDNAProfile();
        setDna(res?.travelDNA || null);
      } catch (_) {
        setDna(null);
      }
    })();
  }, []);

  const fetchItems = async (destination) => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (destination) params.destination = destination;
      const res = await tripAPI.getPreplannedItineraries(params);
      setItems(res?.itineraries || []);
    } catch (e) {
      setError(e?.message || 'Failed to load itineraries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(''); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchItems(filter.trim());
  };

  // Compute a compatibility score between Travel DNA and itinerary activity mix
  const getCompatibility = useMemo(() => {
    if (!dna) return () => null;
    const weights = {
      adventure: (dna.adventureScore || 0) / 10,
      culture: (dna.cultureScore || 0) / 10,
      foodie: (dna.foodieScore || 0) / 10,
      relaxation: (dna.relaxationScore || 0) / 10,
    };
    return (it) => {
      const days = it?.itinerary?.dailyItinerary || [];
      const counts = { adventure: 0, culture: 0, foodie: 0, relaxation: 0 };
      for (const d of days) {
        for (const a of (d.activities || [])) {
          const t = (a.type || '').toLowerCase();
          if (t.includes('adventure')) counts.adventure++;
          else if (t.includes('culture')) counts.culture++;
          else if (t.includes('food')) counts.foodie++;
          else counts.relaxation++;
        }
      }
      const total = Math.max(1, counts.adventure + counts.culture + counts.foodie + counts.relaxation);
      const mix = {
        adventure: counts.adventure / total,
        culture: counts.culture / total,
        foodie: counts.foodie / total,
        relaxation: counts.relaxation / total,
      };
      const dot = mix.adventure * weights.adventure + mix.culture * weights.culture + mix.foodie * weights.foodie + mix.relaxation * weights.relaxation;
      return Math.round(dot * 100);
    };
  }, [dna]);

  // Sort by best match when DNA available, otherwise keep original order
  const sortedItems = useMemo(() => {
    if (!items?.length) return [];
    if (!dna) return items;
    return [...items]
      .map(it => ({ it, score: getCompatibility(it) }))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
      .map(x => ({ ...x.it, _compat: x.score }));
  }, [items, dna, getCompatibility]);

  const openDatePickerForClone = (itinerary) => {
    setPendingCloneTripId(itinerary._id);
    setDateError('');
    setDateStart('');
    setDateEnd('');
    setDateModalOpen(true);
  };

  const confirmCloneWithDates = async () => {
    try {
      if (!pendingCloneTripId) return;
      // Basic validation: require at least a start date
      if (!dateStart) {
        setDateError('Please select a start date');
        return;
      }
      // If end not set, backend will compute from totalDays
      setCloningId(pendingCloneTripId);
      const res = await tripAPI.clonePreplannedItinerary(pendingCloneTripId, { startDate: dateStart, endDate: dateEnd || undefined });
      if (res?.trip) {
        alert('✅ Itinerary added to your trips!');
      } else if (res?.message) {
        alert(res.message);
      }
      setDateModalOpen(false);
      setPendingCloneTripId(null);
    } catch (e) {
      const msg = e?.message || 'Failed to add itinerary';
      alert(msg);
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className='my-trips-container'>
      {!hideHeader && (
        <div className='my-trips-header'>
          <button onClick={onBack} className='back-btn'>← Back to Dashboard</button>
          <h1>🗂️ Preplanned Itineraries</h1>
        </div>
      )}

      {!hideSearch && (
        <form onSubmit={handleSearch} className='trip-plan-form' style={{ marginBottom: 16 }}>
          <div className='form-row'>
            <div className='form-group'>
              <label>Filter by Destination</label>
              <input
                type='text'
                placeholder='e.g., Goa, Bali, Paris'
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <div className='form-group' style={{ alignSelf: 'flex-end' }}>
              <button type='submit' className='generate-trip-btn' disabled={loading}>Search</button>
            </div>
          </div>
        </form>
      )}

      {loading && (
        <div className='loading-container'>
          <div className='loading-spinner'></div>
          <p>Loading itineraries...</p>
        </div>
      )}

      {error && (
        <div className='error-container'>
          <p className='error-message'>{error}</p>
          <button onClick={() => fetchItems(filter)} className='retry-btn'>Try Again</button>
        </div>
      )}

      {!loading && !error && (
        <div className='preplanned-section'>
          {sortedItems.length === 0 ? (
            <div className='no-trips'>
              <div className='no-trips-icon'>🗂️</div>
              <h3>No itineraries found</h3>
              <p>Try a different destination filter.</p>
            </div>
          ) : (
            (() => {
              // Build pages of 4 items each
              const pageSize = 4;
              const pages = [];
              for (let i = 0; i < sortedItems.length; i += pageSize) {
                pages.push(sortedItems.slice(i, i + pageSize));
              }
              const totalPages = pages.length;
              const clampIndex = Math.min(pageIndex, Math.max(0, totalPages - 1));
              if (clampIndex !== pageIndex) setPageIndex(clampIndex);
              return (
                <div style={{ position: 'relative' }}>
                  {/* Carousel viewport */}
                  <div ref={viewportRef} style={{ overflow: 'hidden', width: '100%' }}>
                    {/* Track */}
                    <div
                      style={{
                        display: 'flex',
                        width: 'auto',
                        transform: viewportRef.current ? `translateX(-${viewportRef.current.clientWidth * clampIndex}px)` : 'translateX(0px)',
                        transition: 'transform 400ms ease',
                      }}
                    >
                      {pages.map((page, pi) => (
                        <div key={pi} style={{ flex: '0 0 100%', padding: '0' }}>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '12px'
                          }}>
                            {page.map((it) => (
                              <ItineraryCard
                                key={it._id}
                                itinerary={it}
                                compat={typeof it._compat === 'number' ? it._compat : (dna ? getCompatibility(it) : null)}
                                onView={setSelected}
                                onClone={openDatePickerForClone}
                                cloningId={cloningId}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Nav Buttons */}
                  <button
                    aria-label='Previous'
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                    disabled={clampIndex === 0}
                    style={{
                      position: 'absolute', top: '50%', left: '6px', transform: 'translateY(-50%)',
                      background: '#fff', border: '1px solid #ddd', borderRadius: '20px', padding: '8px 12px', cursor: 'pointer', opacity: clampIndex === 0 ? 0.5 : 1
                    }}
                  >
                    ‹
                  </button>
                  <button
                    aria-label='Next'
                    onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={clampIndex >= totalPages - 1}
                    style={{
                      position: 'absolute', top: '50%', right: '6px', transform: 'translateY(-50%)',
                      background: '#fff', border: '1px solid #ddd', borderRadius: '20px', padding: '8px 12px', cursor: 'pointer', opacity: clampIndex >= totalPages - 1 ? 0.5 : 1
                    }}
                  >
                    ›
                  </button>

                  {/* Dots */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                    {pages.map((_, i) => (
                      <div key={i}
                        onClick={() => setPageIndex(i)}
                        style={{ width: 8, height: 8, borderRadius: '50%', cursor: 'pointer', background: i === clampIndex ? '#ff6b6b' : '#ddd' }}
                      />
                    ))}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Date selection modal for cloning */}
      {dateModalOpen && (
        <div className='modal-overlay' onClick={() => setDateModalOpen(false)}>
          <div className='modal-content' onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className='modal-header'>
              <h3>📅 Choose Your Dates</h3>
              <button className='close-modal' onClick={() => setDateModalOpen(false)}>×</button>
            </div>
            <div className='modal-body'>
              {dateError && <div className='error-message'>⚠️ {dateError}</div>}
              <div className='form-group'>
                <label>Start Date</label>
                <input type='date' value={dateStart} onChange={(e) => { setDateStart(e.target.value); setDateError(''); }} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className='form-group'>
                <label>End Date (optional)</label>
                <input type='date' value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} min={dateStart || new Date().toISOString().split('T')[0]} />
                <small>If left empty, we’ll use the itinerary length to set the end date.</small>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button className='retry-btn' onClick={() => setDateModalOpen(false)} style={{ background: '#6c757d' }}>Cancel</button>
                <button className='generate-trip-btn' onClick={confirmCloneWithDates} disabled={!!cloningId}>{cloningId ? 'Adding...' : 'Add to My Trips'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DetailsModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default PreplannedItineraries;