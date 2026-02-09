// Supabase Edge Function: extract-subscriptions
// Deploy: supabase functions deploy extract-subscriptions
//
// This function proxies OpenAI API calls to keep API keys secure.
// It receives minimized email snippets and returns detected subscriptions.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a subscription detection AI. You analyze email snippets to identify recurring subscription payments.

RULES:
1. Only identify RECURRING subscriptions (not one-time purchases)
2. Extract: service name, amount, currency, billing cycle, confidence score
3. Normalize service names (e.g., "NETFLIX.COM" → "Netflix")
4. Set confidence based on evidence strength:
   - 0.90-1.00: Clear subscription email with amount and service name
   - 0.75-0.89: Likely subscription but missing some details
   - 0.60-0.74: Possible subscription, needs user review
5. Currency codes: TRY, USD, EUR, GBP, etc.
6. Billing cycles: weekly, monthly, quarterly, yearly
7. If amount is not visible, set amount to 0 and lower confidence
8. Categorize: Entertainment, Music, Productivity, Cloud Storage, News, Gaming, Education, Health, Finance, Shopping, Communication, Other

OUTPUT FORMAT: JSON array only, no markdown, no explanation.`;

const USER_PROMPT_TEMPLATE = `Analyze these email snippets and identify recurring subscriptions:

{SNIPPETS}

Return a JSON array of detected subscriptions:
[
  {
    "name": "Service Name",
    "amount": 29.99,
    "currency": "TRY",
    "cycle": "monthly",
    "confidence": 0.92,
    "merchantDomain": "example.com",
    "nextBillingDate": "2026-03-01",
    "category": "Entertainment"
  }
]

If no subscriptions found, return empty array: []`;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { snippets, model = 'gpt-4o-mini' } = await req.json();

    if (!snippets || !Array.isArray(snippets) || snippets.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No snippets provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format snippets for the prompt
    const formattedSnippets = snippets
      .map((s: any, i: number) => {
        return `--- Email ${i + 1} ---
From domain: ${s.domain}
Date: ${s.date}
Preview: ${s.snippet}
Content excerpt: ${s.excerpt}
---`;
      })
      .join('\n\n');

    const userPrompt = USER_PROMPT_TEMPLATE.replace('{SNIPPETS}', formattedSnippets);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,  // Low temperature for consistent output
        max_tokens: 2000,
        response_format: { type: 'json_object' },  // Force JSON output
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${openaiResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content || '[]';

    // Parse the response
    let subscriptions = [];
    try {
      const parsed = JSON.parse(content);
      // Handle both { subscriptions: [...] } and direct array
      subscriptions = Array.isArray(parsed) ? parsed : (parsed.subscriptions || []);
    } catch (parseError) {
      console.error('Failed to parse LLM response:', content);
      subscriptions = [];
    }

    // Return response with usage info
    return new Response(
      JSON.stringify({
        subscriptions,
        tokensUsed: openaiData.usage?.total_tokens || 0,
        model: openaiData.model || model,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
