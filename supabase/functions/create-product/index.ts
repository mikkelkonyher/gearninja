// @ts-nocheck
// supabase/functions/create-product/index.ts
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
    "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
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
  type: 100,
  brand: 100,
  model: 100,
  description: 5000,
  location: 200,
  condition: 50,
};

function validateProduct(data: any, isUpdate: boolean = false) {
  // Required fields for creation
  if (!isUpdate) {
    if (!data.category) {
      return "Kategori er påkrævet";
    }
    if (!data.type) {
      return "Type er påkrævet";
    }
    if (!data.image_urls || !Array.isArray(data.image_urls) || data.image_urls.length === 0) {
      return "Mindst ét billede er påkrævet";
    }
  }

  // Validate lengths
  if (data.type && data.type.length > MAX_LENGTHS.type) {
    return `Type må højst være ${MAX_LENGTHS.type} tegn`;
  }
  if (data.brand && data.brand.length > MAX_LENGTHS.brand) {
    return `Mærke må højst være ${MAX_LENGTHS.brand} tegn`;
  }
  if (data.model && data.model.length > MAX_LENGTHS.model) {
    return `Model må højst være ${MAX_LENGTHS.model} tegn`;
  }
  if (data.description && data.description.length > MAX_LENGTHS.description) {
    return `Beskrivelse må højst være ${MAX_LENGTHS.description} tegn`;
  }
  if (data.location && data.location.length > MAX_LENGTHS.location) {
    return `Lokation må højst være ${MAX_LENGTHS.location} tegn`;
  }
  if (data.condition && data.condition.length > MAX_LENGTHS.condition) {
    return `Stand må højst være ${MAX_LENGTHS.condition} tegn`;
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

  // Validate year
  if (data.year !== null && data.year !== undefined) {
    const year = parseInt(data.year);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      return "År skal være mellem 1900 og nuværende år";
    }
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

  // Validate category
  const validCategories = [
    "trommer",
    "guitar",
    "bas",
    "keyboards",
    "blaes",
    "studieudstyr",
    "strygere",
  ];
  if (data.category && !validCategories.includes(data.category)) {
    return "Ugyldig kategori";
  }

  return null;
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse("Method not allowed", origin, { status: 405 });
  }

  // Get auth token
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return unauthorized("Manglende autorisation", origin);
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return unauthorized("Ugyldig eller manglende bruger", origin);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Ugyldigt JSON-body", origin);
  }

  const isUpdate = !!body.id;
  const validationError = validateProduct(body, isUpdate);
  if (validationError) {
    return badRequest(validationError, origin);
  }

  // Prepare product data
  const productData: any = {
    category: body.category,
    type: body.type?.trim() || null,
    brand: body.brand?.trim() || null,
    model: body.model?.trim() || null,
    description: body.description?.trim() || null,
    price: body.price ? parseFloat(body.price) : null,
    location: body.location?.trim() || null,
    condition: body.condition?.trim() || null,
    year:
      body.year && body.year !== "Ved ikke"
        ? parseInt(body.year)
        : null,
    image_urls: body.image_urls || [],
  };

  try {
    if (isUpdate && body.id) {
      // Update existing product
      const { data: existingProduct, error: fetchError } = await supabase
        .from("products")
        .select("user_id")
        .eq("id", body.id)
        .single();

      if (fetchError || !existingProduct) {
        return badRequest("Produkt ikke fundet", origin);
      }

      if (existingProduct.user_id !== user.id) {
        return unauthorized("Du har ikke tilladelse til at opdatere dette produkt", origin);
      }

      const { error: updateError } = await supabase
        .from("products")
        .update(productData)
        .eq("id", body.id)
        .eq("user_id", user.id);

      if (updateError) {
        return badRequest(updateError.message || "Kunne ikke opdatere produkt", origin);
      }

      return jsonResponse(
        { message: "Produkt opdateret", id: body.id },
        origin,
        { status: 200 }
      );
    } else {
      // Create new product
      productData.user_id = user.id;

      const { data, error: insertError } = await supabase
        .from("products")
        .insert(productData)
        .select("id")
        .single();

      if (insertError) {
        return badRequest(insertError.message || "Kunne ikke oprette produkt", origin);
      }

      return jsonResponse(
        { message: "Produkt oprettet", id: data.id },
        origin,
        { status: 201 }
      );
    }
  } catch (err: any) {
    return badRequest(err.message || "Der skete en fejl", origin);
  }
});

