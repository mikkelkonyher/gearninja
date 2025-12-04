import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
      ...corsHeaders,
    },
  });
}

function badRequest(message: string) {
  return jsonResponse({ error: message }, { status: 400 });
}

function unauthorized(message: string) {
  return jsonResponse({ error: message }, { status: 401 });
}

// Validation constants
const MAX_LENGTHS = {
  name: 200,
  address: 300,
  description: 5000,
};

const VALID_TYPES = ["Musikstudie", "Øvelokale", "Andet"];
const VALID_PAYMENT_TYPES = ["pr/time", "pr måned"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return unauthorized("Ingen authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return unauthorized("Unauthorized");
    }

    const {
      id,
      type,
      name,
      address,
      location,
      description,
      payment_type,
      price,
      room_size,
      image_urls,
    } = await req.json();

    // Validate required fields
    if (!type) {
      return badRequest("Type er påkrævet");
    }

    if (!VALID_TYPES.includes(type)) {
      return badRequest(`Type skal være en af: ${VALID_TYPES.join(", ")}`);
    }

    if (!payment_type) {
      return badRequest("Betalingstype er påkrævet");
    }

    if (!VALID_PAYMENT_TYPES.includes(payment_type)) {
      return badRequest(`Betalingstype skal være en af: ${VALID_PAYMENT_TYPES.join(", ")}`);
    }

    // Validate string lengths
    if (name && name.length > MAX_LENGTHS.name) {
      return badRequest(`Navn må maks være ${MAX_LENGTHS.name} tegn`);
    }

    if (address && address.length > MAX_LENGTHS.address) {
      return badRequest(`Adresse må maks være ${MAX_LENGTHS.address} tegn`);
    }

    if (description && description.length > MAX_LENGTHS.description) {
      return badRequest(`Beskrivelse må maks være ${MAX_LENGTHS.description} tegn`);
    }

    // Validate numbers
    if (price !== null && price !== undefined) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return badRequest("Pris skal være et positivt tal");
      }
    }

    if (room_size !== null && room_size !== undefined) {
      const sizeNum = parseFloat(room_size);
      if (isNaN(sizeNum) || sizeNum < 0) {
        return badRequest("Størrelse skal være et positivt tal");
      }
    }

    // Validate image URLs
    if (image_urls) {
      if (!Array.isArray(image_urls)) {
        return badRequest("image_urls skal være en array");
      }
      if (image_urls.length > 6) {
        return badRequest("Maks 6 billeder tilladt");
      }
      // Validate each URL
      for (const url of image_urls) {
        if (typeof url !== "string" || !url.startsWith("http")) {
          return badRequest("Ugyldigt billede URL");
        }
      }
    }

    const roomData = {
      type,
      name: name || null,
      address: address || null,
      location: location || null,
      description: description || null,
      payment_type,
      price: price !== null && price !== undefined ? parseFloat(price) : null,
      room_size: room_size !== null && room_size !== undefined ? parseFloat(room_size) : null,
      image_urls: image_urls || [],
    };

    if (id) {
      // Update existing room
      // Verify ownership
      const { data: existingRoom, error: fetchError } = await supabase
        .from("rehearsal_rooms")
        .select("user_id")
        .eq("id", id)
        .single();

      if (fetchError || !existingRoom) {
        return jsonResponse({ error: "Lokale ikke fundet" }, { status: 404 });
      }

      if (existingRoom.user_id !== user.id) {
        return jsonResponse({ error: "Du har ikke tilladelse til at redigere dette lokale" }, { status: 403 });
      }

      const { data: room, error: updateError } = await supabase
        .from("rehearsal_rooms")
        .update(roomData)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating room:", updateError);
        return jsonResponse({ error: "Kunne ikke opdatere lokale" }, { status: 500 });
      }

      return jsonResponse({ room }, { status: 200 });
    } else {
      // Create new room
      const { data: room, error: insertError } = await supabase
        .from("rehearsal_rooms")
        .insert({
          ...roomData,
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating room:", insertError);
        return jsonResponse({ error: "Kunne ikke oprette lokale" }, { status: 500 });
      }

      return jsonResponse({ room }, { status: 201 });
    }
  } catch (error) {
    console.error("Error in create-room function:", error);
    return jsonResponse({ error: "Der skete en intern fejl" }, { status: 500 });
  }
});
