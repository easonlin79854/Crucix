// OpenSky Network — Real-time flight tracking
// Free for research. 4,000 API credits/day (no auth), 8,000 with account.
// Tracks all aircraft with ADS-B transponders including many military.

import { safeFetch } from '../utils/fetch.mjs';

const BASE = 'https://opensky-network.org/api';

// Get all current flights (global state vector)
export async function getAllFlights() {
  return safeFetch(`${BASE}/states/all`, { timeout: 30000 });
}

// Get flights in a bounding box (lat/lon)
export async function getFlightsInArea(lamin, lomin, lamax, lomax) {
  const params = new URLSearchParams({
    lamin: String(lamin),
    lomin: String(lomin),
    lamax: String(lamax),
    lomax: String(lomax),
  });
  return safeFetch(`${BASE}/states/all?${params}`, { timeout: 20000 });
}

// Get flights by specific aircraft (ICAO24 hex codes)
export async function getFlightsByIcao(icao24List) {
  const icao = Array.isArray(icao24List) ? icao24List : [icao24List];
  const params = icao.map(i => `icao24=${i}`).join('&');
  return safeFetch(`${BASE}/states/all?${params}`, { timeout: 20000 });
}

// Get departures from an airport in a time range
export async function getDepartures(airportIcao, begin, end) {
  const params = new URLSearchParams({
    airport: airportIcao,
    begin: String(Math.floor(begin / 1000)),
    end: String(Math.floor(end / 1000)),
  });
  return safeFetch(`${BASE}/flights/departure?${params}`);
}

// Get arrivals at an airport
export async function getArrivals(airportIcao, begin, end) {
  const params = new URLSearchParams({
    airport: airportIcao,
    begin: String(Math.floor(begin / 1000)),
    end: String(Math.floor(end / 1000)),
  });
  return safeFetch(`${BASE}/flights/arrival?${params}`);
}

// Key hotspot regions for monitoring
const HOTSPOTS = {
  taiwan: { lamin: 20, lomin: 115, lamax: 28, lomax: 125, label: 'Taiwan Strait' },
  southChinaSea: { lamin: 5, lomin: 105, lamax: 23, lomax: 122, label: 'South China Sea' },
  koreanPeninsula: { lamin: 33, lomin: 124, lamax: 43, lomax: 132, label: 'Korean Peninsula' },
  eastChinaSea: { lamin: 24, lomin: 120, lamax: 34, lomax: 132, label: 'East China Sea' },
  japan: { lamin: 30, lomin: 129, lamax: 46, lomax: 146, label: 'Japan Airspace' },
  philippines: { lamin: 4, lomin: 116, lamax: 21, lomax: 127, label: 'Philippines' },
  malacca: { lamin: -1, lomin: 95, lamax: 7, lomax: 104, label: 'Strait of Malacca' },
  bayOfBengal: { lamin: 5, lomin: 80, lamax: 23, lomax: 98, label: 'Bay of Bengal' },
  southAsia: { lamin: 6, lomin: 68, lamax: 32, lomax: 90, label: 'South Asia' },
  middleEast: { lamin: 12, lomin: 30, lamax: 42, lomax: 65, label: 'Middle East' },
};

// Briefing — check hotspot regions for flight activity
export async function briefing() {
  const hotspotEntries = Object.entries(HOTSPOTS);
  const results = await Promise.all(
    hotspotEntries.map(async ([key, box]) => {
      const data = await getFlightsInArea(box.lamin, box.lomin, box.lamax, box.lomax);
      const error = data?.error || null;
      const states = data?.states || [];
      return {
        region: box.label,
        key,
        totalAircraft: states.length,
        // states format: [icao24, callsign, origin_country, ...]
        byCountry: states.reduce((acc, s) => {
          const country = s[2] || 'Unknown';
          acc[country] = (acc[country] || 0) + 1;
          return acc;
        }, {}),
        // Flag potentially interesting (military often have no callsign or specific patterns)
        noCallsign: states.filter(s => !s[1]?.trim()).length,
        highAltitude: states.filter(s => s[7] && s[7] > 12000).length, // >12km altitude
        ...(error ? { error } : {}),
      };
    })
  );

  const hotspotErrors = results
    .filter(r => r.error)
    .map(r => ({ region: r.region, error: r.error }));

  return {
    source: 'OpenSky',
    timestamp: new Date().toISOString(),
    hotspots: results,
    ...(hotspotErrors.length ? {
      error: hotspotErrors.length === results.length
        ? `OpenSky unavailable across all hotspots: ${hotspotErrors[0].error}`
        : `OpenSky unavailable for ${hotspotErrors.length}/${results.length} hotspots`,
      hotspotErrors,
    } : {}),
  };
}

if (process.argv[1]?.endsWith('opensky.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
