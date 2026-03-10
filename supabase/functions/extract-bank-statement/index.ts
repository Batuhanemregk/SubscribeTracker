// Supabase Edge Function: extract-bank-statement
// Uses OpenAI Chat Completions API with gpt-4.1-mini for both PDF and image analysis.
// PDF: sent via 'file' content type with inline base64 data URL
// Image: sent via 'image_url' content type with inline base64 data URL

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

const SYSTEM_PROMPT = `You are a subscription and recurring payment detection specialist. The user will provide a bank or credit card statement (PDF or image). Your job is to carefully read the ENTIRE document — every page, every single transaction line — and identify ALL recurring subscription or membership payments.

CRITICAL RULES:
1. Read EVERY transaction on EVERY page. Do NOT skip any rows or pages.
2. Be INCLUSIVE, not exclusive. When in doubt, INCLUDE the transaction. It is better to return a false positive than to miss a real subscription.
3. Return EVERY occurrence of each subscription separately. If a service charged 3 times across different months, return 3 separate entries with their respective dates. Do NOT merge or deduplicate.
4. Use your own knowledge and judgment to determine what is a subscription. Any payment to a service that typically charges on a recurring basis should be included — streaming, cloud storage, music, gaming, productivity tools, fitness apps, VPNs, telecom bills, insurance, memberships, etc.
5. Raw merchant names in bank statements can be cryptic (e.g. "GOOGLE*YOUTUBE", "APPLE.COM/BILL", "SPOTIFY AB"). Use your knowledge to identify the actual service behind the merchant name.

For each subscription found, extract:
- name: Clean, human-readable service name (e.g. "Netflix" not "NETFLIX.COM")
- amount: The numeric charge amount (just the number, no currency symbol)
- currency: Detected from the statement (TRY, USD, EUR, GBP, etc.)
- cycle: Best guess of billing frequency (monthly, yearly, weekly, quarterly)
- confidence: 0.0 to 1.0 (0.9+ for clear subscriptions, 0.7-0.9 for probable, 0.5-0.7 for possible)
- merchantName: The EXACT raw merchant name as it appears in the statement
- lastChargeDate: The date of THIS specific charge (YYYY-MM-DD format)

Return ONLY a JSON object with no markdown, no explanation, no code fences.
If the document is unreadable or not a bank statement, return: { "subscriptions": [], "error": "reason" }`;

const USER_PROMPT = `Analyze this bank/credit card statement. Read through EVERY page, EVERY transaction line carefully. Find ALL payments that look like subscriptions, memberships, or recurring service charges.

IMPORTANT: Return EVERY occurrence separately — do NOT merge duplicates. If the same service charged multiple times, list each charge with its own date.

Return this exact JSON format:
{
  "subscriptions": [
    {
      "name": "Service Name",
      "amount": 0.00,
      "currency": "TRY",
      "cycle": "monthly",
      "confidence": 0.90,
      "merchantName": "RAW MERCHANT NAME FROM STATEMENT",
      "lastChargeDate": "2026-01-15"
    }
  ],
  "monthsCovered": 3
}

If no subscriptions are found, return: { "subscriptions": [], "monthsCovered": 0 }`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return jsonResponse(500, { error: 'OpenAI API key not configured' });
    }

    const { fileBase64, mimeType } = await req.json();

    if (!fileBase64) {
      return jsonResponse(400, { error: 'No file content provided' });
    }

    const isImage = mimeType?.startsWith('image/');
    const isPdf = mimeType === 'application/pdf';

    if (!isPdf && !isImage) {
      return jsonResponse(400, { error: `Unsupported file type: ${mimeType}` });
    }

    console.log(`Processing | type: ${isPdf ? 'PDF' : 'Image'} | size: ${Math.round(fileBase64.length / 1024)}KB`);

    // Build content array based on file type
    const userContent: any[] = [{ type: 'text', text: USER_PROMPT }];

    if (isPdf) {
      userContent.push({
        type: 'file',
        file: {
          filename: 'bank_statement.pdf',
          file_data: `data:application/pdf;base64,${fileBase64}`,
        },
      });
    } else {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${fileBase64}`,
          detail: 'high',
        },
      });
    }

    // Chat Completions call with gpt-4.1-mini (50s timeout to stay within Edge Function limits)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50_000);

    let res: Response;
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
          temperature: 0.1,
          max_tokens: 16000,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return jsonResponse(504, { error: 'Analysis timed out. Try a smaller or clearer document.' });
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.error('OpenAI error:', res.status, errText);

      // Return user-friendly error messages based on status code
      let userMessage: string;
      switch (res.status) {
        case 429:
          userMessage = 'The analysis service is temporarily busy. Please try again in a moment.';
          break;
        case 401:
        case 403:
          userMessage = 'Service authentication error. Please contact support.';
          break;
        case 413:
          userMessage = 'The file is too large for analysis. Please use a smaller file.';
          break;
        case 500:
        case 502:
        case 503:
          userMessage = 'The analysis service is temporarily unavailable. Please try again later.';
          break;
        default:
          userMessage = 'Failed to analyze the document. Please try again.';
      }

      return jsonResponse(502, { error: userMessage });
    }

    const chatJson = await res.json();
    const finishReason = chatJson.choices?.[0]?.finish_reason;
    const content = chatJson.choices?.[0]?.message?.content || '{"subscriptions":[]}';
    console.log('Model output (first 800):', content.substring(0, 800));
    console.log('Finish reason:', finishReason);

    // Check if response was truncated
    if (finishReason === 'length') {
      console.warn('Response was truncated (max_tokens reached)');
      return jsonResponse(200, {
        subscriptions: [],
        tokensUsed: chatJson.usage?.total_tokens || 0,
        monthsCovered: 0,
        model: chatJson.model || 'gpt-4.1-mini',
        error: 'The document has too many transactions for a single scan. Try uploading a shorter statement (1-2 months).',
      });
    }

    let subscriptions: any[] = [];
    let monthsCovered = 1;
    let gptError: string | undefined;
    try {
      const parsed = JSON.parse(content);
      subscriptions = parsed.subscriptions || (Array.isArray(parsed) ? parsed : []);
      monthsCovered = parsed.monthsCovered || 1;
      // Forward GPT error message (e.g., "not a bank statement", "document is unreadable")
      if (parsed.error && typeof parsed.error === 'string') {
        gptError = parsed.error;
      }
    } catch {
      console.error('JSON parse failed:', content);
      return jsonResponse(200, {
        subscriptions: [],
        tokensUsed: chatJson.usage?.total_tokens || 0,
        monthsCovered: 0,
        model: chatJson.model || 'gpt-4.1-mini',
        error: 'Failed to parse the analysis results. Please try again with a clearer document.',
      });
    }

    const tokensUsed = chatJson.usage?.total_tokens || 0;
    const modelUsed = chatJson.model || 'gpt-4.1-mini';

    console.log(`Done: ${subscriptions.length} subscriptions | months: ${monthsCovered} | model: ${modelUsed} | tokens: ${tokensUsed}`);

    return jsonResponse(200, {
      subscriptions,
      tokensUsed,
      monthsCovered,
      model: modelUsed,
      ...(gptError && { error: gptError }),
    });

  } catch (error: any) {
    console.error('Edge function error:', error.message, error.stack);
    return jsonResponse(500, { error: 'An unexpected error occurred while analyzing your document. Please try again.' });
  }
});
