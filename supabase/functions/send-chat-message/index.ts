import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { chat_id, content } = await req.json();

    // 1. Validate Input
    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "Message content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (content.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Message exceeds 1000 characters limit" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!chat_id) {
      return new Response(JSON.stringify({ error: "Chat ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Rate Limiting
    // Check how many messages this user sent in the last minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    
    // We need to use service role key to query messages without RLS if we want to be strict,
    // but querying user's own messages with their auth context is fine and safer.
    // However, to prevent spam effectively, we should count ALL messages sent by this user.
    // Since users can only see their own messages anyway, querying 'messages' with their auth context
    // will return their sent messages.
    const { count, error: countError } = await supabaseClient
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .gte("created_at", oneMinuteAgo);

    if (countError) {
      console.error("Error checking rate limit:", countError);
      return new Response(
        JSON.stringify({ error: "Failed to check rate limit" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (count !== null && count >= 10) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. You can only send 10 messages per minute.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Insert Message
    const { data, error } = await supabaseClient
      .from("messages")
      .insert({
        chat_id,
        sender_id: user.id,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting message:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
