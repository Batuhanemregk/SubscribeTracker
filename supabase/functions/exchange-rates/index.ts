// Supabase Edge Function: exchange-rates
// Fetches and returns current exchange rates with USD as base
// Deno runtime

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache rates in-memory for the function instance
let cachedRates: Record<string, number> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const now = Date.now();

    // Return cached rates if fresh
    if (cachedRates && now - cacheTimestamp < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify({ rates: cachedRates, cached: true, timestamp: cacheTimestamp }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch from a free exchange rate API (no key needed)
    const response = await fetch('https://open.er-api.com/v6/latest/USD');

    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== 'success' || !data.rates) {
      throw new Error('Invalid API response');
    }

    // Extract only the currencies we support
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'CAD', 'AUD'];
    const filteredRates: Record<string, number> = {};

    for (const currency of supportedCurrencies) {
      if (data.rates[currency]) {
        filteredRates[currency] = data.rates[currency];
      }
    }

    // Cache the rates
    cachedRates = filteredRates;
    cacheTimestamp = now;

    return new Response(
      JSON.stringify({
        rates: filteredRates,
        cached: false,
        timestamp: now,
        nextUpdate: data.time_next_update_unix ? data.time_next_update_unix * 1000 : null,
      }),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Exchange rate fetch error:', error);

    // If we have cached rates, return them even if stale
    if (cachedRates) {
      return new Response(
        JSON.stringify({ rates: cachedRates, cached: true, stale: true, timestamp: cacheTimestamp }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to fetch exchange rates' }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
});
