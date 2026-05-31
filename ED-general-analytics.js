import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

const DEDUP_WINDOW_MS = 10000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let body: { entity_type?: string; entity_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const { entity_type, entity_id } = body;
  if (!entity_type || !entity_id) {
    return new Response("Missing entity_type or entity_id", { status: 400, headers: corsHeaders });
  }

  // 1. Check dedup window
  const { data: lastEntry, error: selectError } = await supabase
    .from("interaction_logs")
    .select("created_at")
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    return new Response(`Select error: ${selectError.message}`, { status: 500, headers: corsHeaders });
  }

  if (lastEntry) {
    const lastTime = new Date(lastEntry.created_at).getTime();
    if (Date.now() - lastTime < DEDUP_WINDOW_MS) {
      return new Response("Too many requests", { status: 429, headers: corsHeaders });
    }
  }

  // 2. Log the request
  const { error: insertError } = await supabase
    .from("interaction_logs")
    .insert({ entity_type, entity_id });

  if (insertError) {
    return new Response(`Insert error: ${insertError.message}`, { status: 500, headers: corsHeaders });
  }

  // 3. Increment the counter
  const { error: rpcError } = await supabase.rpc("increment_interaction", {
    p_entity_type: entity_type,
    p_entity_id: entity_id,
  });

  if (rpcError) {
    return new Response(`RPC error: ${rpcError.message}`, { status: 500, headers: corsHeaders });
  }

  return new Response("OK", { status: 200, headers: corsHeaders });
});