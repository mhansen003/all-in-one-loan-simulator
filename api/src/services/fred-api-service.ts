/**
 * FRED API Service
 *
 * Fetches current mortgage rates from Federal Reserve Economic Data (FRED)
 * Documentation: https://fred.stlouisfed.org/docs/api/fred/
 */

interface FredObservation {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
}

interface FredApiResponse {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: FredObservation[];
}

interface MortgageRateData {
  rate: number;
  date: string;
  source: string;
  seriesId: string;
}

/**
 * Fetch current 30-year fixed mortgage rate from FRED API
 * Series: MORTGAGE30US
 *
 * @returns Current mortgage rate data
 * @throws Error if API call fails or rate is unavailable
 */
export async function fetchCurrentMortgageRate(): Promise<MortgageRateData> {
  const FRED_API_KEY = process.env.FRED_API_KEY;

  if (!FRED_API_KEY) {
    console.warn('FRED_API_KEY not configured, using fallback rate');
    // Fallback to a reasonable default if API key is not configured
    return {
      rate: 6.5,
      date: new Date().toISOString().split('T')[0],
      source: 'Default (FRED API key not configured)',
      seriesId: 'MORTGAGE30US'
    };
  }

  const SERIES_ID = 'MORTGAGE30US'; // 30-Year Fixed Rate Mortgage Average
  const API_URL = 'https://api.stlouisfed.org/fred/series/observations';

  try {
    const url = new URL(API_URL);
    url.searchParams.append('series_id', SERIES_ID);
    url.searchParams.append('api_key', FRED_API_KEY);
    url.searchParams.append('file_type', 'json');
    url.searchParams.append('sort_order', 'desc'); // Most recent first
    url.searchParams.append('limit', '1'); // Only need the latest

    console.log(`Fetching mortgage rate from FRED API (series: ${SERIES_ID})...`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FRED API returned status ${response.status}: ${response.statusText}`);
    }

    const data: FredApiResponse = await response.json();

    if (!data.observations || data.observations.length === 0) {
      throw new Error('No mortgage rate data available from FRED API');
    }

    const latestObservation = data.observations[0];
    const rate = parseFloat(latestObservation.value);

    if (isNaN(rate)) {
      throw new Error(`Invalid rate value from FRED API: ${latestObservation.value}`);
    }

    console.log(`✓ Fetched current mortgage rate: ${rate}% (as of ${latestObservation.date})`);

    return {
      rate,
      date: latestObservation.date,
      source: 'Federal Reserve Economic Data (FRED)',
      seriesId: SERIES_ID
    };
  } catch (error) {
    console.error('Error fetching mortgage rate from FRED:', error);
    throw new Error(`Failed to fetch mortgage rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get cached rate or fetch fresh data
 * Implements simple in-memory caching to avoid excessive API calls
 */
let cachedRate: MortgageRateData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function getCurrentMortgageRate(): Promise<MortgageRateData> {
  const now = Date.now();

  // Return cached rate if still valid
  if (cachedRate && (now - cacheTimestamp) < CACHE_DURATION_MS) {
    console.log(`Using cached mortgage rate: ${cachedRate.rate}% (cached ${Math.round((now - cacheTimestamp) / 1000 / 60)} minutes ago)`);
    return cachedRate;
  }

  // Fetch fresh data
  console.log('Cache expired or empty, fetching fresh mortgage rate...');
  const freshRate = await fetchCurrentMortgageRate();

  // Update cache
  cachedRate = freshRate;
  cacheTimestamp = now;

  return freshRate;
}
