import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://www.gearninja.dk"
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(body: unknown, origin: string | null, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
      ...getCorsHeaders(origin),
    },
  });
}

function badRequest(message: string, origin: string | null) {
  return jsonResponse({ error: message }, origin, { status: 400 });
}

function unauthorized(message: string, origin: string | null) {
  return jsonResponse({ error: message }, origin, { status: 401 });
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
  const origin = req.headers.get("Origin");
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return unauthorized("Ingen authorization header", origin);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return unauthorized("Unauthorized", origin);
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
      return badRequest("Type er påkrævet", origin);
    }

    if (!VALID_TYPES.includes(type)) {
      return badRequest(`Type skal være en af: ${VALID_TYPES.join(", ")}`, origin);
    }

    if (!payment_type) {
      return badRequest("Betalingstype er påkrævet", origin);
    }

    if (!VALID_PAYMENT_TYPES.includes(payment_type)) {
      return badRequest(`Betalingstype skal være en af: ${VALID_PAYMENT_TYPES.join(", ")}`, origin);
    }

    // Validate string lengths
    if (name && name.length > MAX_LENGTHS.name) {
      return badRequest(`Navn må maks være ${MAX_LENGTHS.name} tegn`, origin);
    }

    if (address && address.length > MAX_LENGTHS.address) {
      return badRequest(`Adresse må maks være ${MAX_LENGTHS.address} tegn`, origin);
    }

    if (description && description.length > MAX_LENGTHS.description) {
      return badRequest(`Beskrivelse må maks være ${MAX_LENGTHS.description} tegn`, origin);
    }

    // Validate numbers
    if (price !== null && price !== undefined) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return badRequest("Pris skal være et positivt tal", origin);
      }
    }

    if (room_size !== null && room_size !== undefined) {
      const sizeNum = parseFloat(room_size);
      if (isNaN(sizeNum) || sizeNum < 0) {
        return badRequest("Størrelse skal være et positivt tal", origin);
      }
    }

    // Validate image URLs
    if (image_urls) {
      if (!Array.isArray(image_urls)) {
        return badRequest("image_urls skal være en array", origin);
      }
      if (image_urls.length > 6) {
        return badRequest("Maks 6 billeder tilladt", origin);
      }
      // Validate each URL
      for (const url of image_urls) {
        if (typeof url !== "string" || !url.startsWith("http")) {
          return badRequest("Ugyldigt billede URL", origin);
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
        return jsonResponse({ error: "Lokale ikke fundet" }, origin, { status: 404 });
      }

      if (existingRoom.user_id !== user.id) {
        return jsonResponse({ error: "Du har ikke tilladelse til at redigere dette lokale" }, origin, { status: 403 });
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
        return jsonResponse({ error: "Kunne ikke opdatere lokale" }, origin, { status: 500 });
      }

      return jsonResponse({ room }, origin, { status: 200 });
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
        return jsonResponse({ error: "Kunne ikke oprette lokale" }, origin, { status: 500 });
      }

      return jsonResponse({ room }, origin, { status: 201 });
    }
  } catch (error) {
    console.error("Error in create-room function:", error);
    return jsonResponse({ error: "Der skete en intern fejl" }, origin, { status: 500 });
  }
});
