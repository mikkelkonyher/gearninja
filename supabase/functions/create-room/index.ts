// @ts-nocheck
// supabase/functions/create-room/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
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
  address: 500,
  location: 200,
  description: 5000,
  payment_type: 50,
  type: 50,
};

function validateRoom(data: any, isUpdate: boolean = false) {
  // Required fields for creation
  if (!isUpdate) {
    if (!data.type) {
      return "Type er påkrævet";
    }
    if (!data.image_urls || !Array.isArray(data.image_urls) || data.image_urls.length === 0) {
      return "Mindst ét billede er påkrævet";
    }
  }

  // Validate lengths
  if (data.name && data.name.length > MAX_LENGTHS.name) {
    return `Navn må højst være ${MAX_LENGTHS.name} tegn`;
  }
  if (data.address && data.address.length > MAX_LENGTHS.address) {
    return `Adresse må højst være ${MAX_LENGTHS.address} tegn`;
  }
  if (data.location && data.location.length > MAX_LENGTHS.location) {
    return `Lokation må højst være ${MAX_LENGTHS.location} tegn`;
  }
  if (data.description && data.description.length > MAX_LENGTHS.description) {
    return `Beskrivelse må højst være ${MAX_LENGTHS.description} tegn`;
  }
  if (data.payment_type && data.payment_type.length > MAX_LENGTHS.payment_type) {
    return `Betalingstype må højst være ${MAX_LENGTHS.payment_type} tegn`;
  }
  if (data.type && data.type.length > MAX_LENGTHS.type) {
    return `Type må højst være ${MAX_LENGTHS.type} tegn`;
  }

  // Validate price
  if (data.price !== null && data.price !== undefined) {
    const price = parseFloat(data.price);
    if (isNaN(price) || price < 0) {
      return "Pris skal være et positivt tal";
    }
    if (price > 99999999.99) {
      return "Pris er for høj";
    }
  }

  // Validate room_size
  if (data.room_size !== null && data.room_size !== undefined) {
    const size = parseFloat(data.room_size);
    if (isNaN(size) || size < 0) {
      return "Størrelse skal være et positivt tal";
    }
    if (size > 10000) {
      return "Størrelse er for stor";
    }
  }

  // Validate type
  const validTypes = ["Musikstudie", "Øvelokale", "Andet"];
  if (data.type && !validTypes.includes(data.type)) {
    return "Ugyldig type. Vælg mellem Musikstudie, Øvelokale eller Andet";
  }

  // Validate payment_type
  const validPaymentTypes = ["pr/time", "pr måned"];
  if (data.payment_type && !validPaymentTypes.includes(data.payment_type)) {
    return "Ugyldig betalingstype";
  }

  // Validate image_urls
  if (data.image_urls) {
    if (!Array.isArray(data.image_urls)) {
      return "image_urls skal være en array";
    }
    if (data.image_urls.length > 10) {
      return "Maksimalt 10 billeder tilladt";
    }
    for (const url of data.image_urls) {
      if (typeof url !== "string" || url.length > 500) {
        return "Ugyldig billede URL";
      }
    }
  }

  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse("Method not allowed", { status: 405 });
  }

  // Get auth token
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return unauthorized("Manglende autorisation");
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return unauthorized("Ugyldig eller manglende bruger");
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Ugyldigt JSON-body");
  }

  const isUpdate = !!body.id;
  const validationError = validateRoom(body, isUpdate);
  if (validationError) {
    return badRequest(validationError);
  }

  // Prepare room data
  const roomData: any = {
    name: body.name?.trim() || null,
    address: body.address?.trim() || null,
    location: body.location?.trim() || null,
    description: body.description?.trim() || null,
    payment_type: body.payment_type?.trim() || null,
    price: body.price ? parseFloat(body.price) : null,
    room_size: body.room_size ? parseFloat(body.room_size) : null,
    type: body.type?.trim(),
    image_urls: body.image_urls || [],
  };

  try {
    if (isUpdate && body.id) {
      // Update existing room
      const { data: existingRoom, error: fetchError } = await supabase
        .from("rehearsal_rooms")
        .select("user_id")
        .eq("id", body.id)
        .single();

      if (fetchError || !existingRoom) {
        return badRequest("Lokale ikke fundet");
      }

      if (existingRoom.user_id !== user.id) {
        return unauthorized("Du har ikke tilladelse til at opdatere dette lokale");
      }

      const { error: updateError } = await supabase
        .from("rehearsal_rooms")
        .update(roomData)
        .eq("id", body.id)
        .eq("user_id", user.id);

      if (updateError) {
        return badRequest(updateError.message || "Kunne ikke opdatere lokale");
      }

      return jsonResponse(
        { message: "Lokale opdateret", id: body.id },
        { status: 200 }
      );
    } else {
      // Create new room
      roomData.user_id = user.id;

      const { data, error: insertError } = await supabase
        .from("rehearsal_rooms")
        .insert(roomData)
        .select("id")
        .single();

      if (insertError) {
        return badRequest(insertError.message || "Kunne ikke oprette lokale");
      }

      return jsonResponse(
        { message: "Lokale oprettet", id: data.id },
        { status: 201 }
      );
    }
  } catch (err: any) {
    return badRequest(err.message || "Der skete en fejl");
  }
});

