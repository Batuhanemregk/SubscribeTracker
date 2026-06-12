// Supabase Edge Function: delete-account
// Deploy: npx supabase functions deploy delete-account
//
// Permanently deletes the calling user's account and all derived data. The
// caller is identified from their JWT (forwarded automatically by
// supabase-js `functions.invoke`). Deletion uses the service-role key, which
// only ever lives here in the Edge Function — never in the app bundle.
//
// Order: delete subscriptions, then the public.users row, then the auth user —
// each fatal on error so a failure stays retryable and never orphans data
// (there is NO FK cascade from auth.users to public.users). Satisfies the
// project's delete-account rule (disconnect + delete all derived data + tokens).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { ok: false, error: "Missing authorization header." });

    // These are injected automatically into every Supabase Edge Function.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
      return json(500, { ok: false, error: "Server is not configured." });
    }

    // Identify the caller from their JWT.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json(401, { ok: false, error: "Invalid or expired session." });

    const uid = user.id;

    // Service-role client for privileged deletes.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Delete derived data BEFORE the auth identity so a failure here is
    // retryable (the user can still re-authenticate). There is no FK from
    // public.users to auth.users, so deleting the auth user does NOT cascade —
    // we must delete the rows explicitly. Each step is fatal on a real error.
    const { error: subErr } = await admin.from("subscriptions").delete().eq("user_id", uid);
    if (subErr) {
      console.error("delete-account: subscriptions delete error:", subErr.message);
      return json(500, { ok: false, error: "Failed to delete account. Please try again." });
    }

    const { error: rowErr } = await admin.from("users").delete().eq("id", uid);
    if (rowErr) {
      console.error("delete-account: users row delete error:", rowErr.message);
      return json(500, { ok: false, error: "Failed to delete account. Please try again." });
    }

    // Finally delete the auth user (revokes tokens / sessions).
    const { error: authErr } = await admin.auth.admin.deleteUser(uid);
    if (authErr) {
      console.error("delete-account: auth user delete error:", authErr.message);
      return json(500, { ok: false, error: "Failed to delete account. Please try again." });
    }

    console.log(`delete-account: deleted ${uid}`);
    return json(200, { ok: true });
  } catch (error: any) {
    console.error("delete-account error:", error?.message);
    return json(500, { ok: false, error: "An unexpected error occurred." });
  }
});
