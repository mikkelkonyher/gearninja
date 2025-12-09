import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.1";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://www.gearninja.dk"
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

interface ReviewPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  record: {
    id: string;
    sale_id: string;
    reviewer_id: string;
    reviewee_id: string;
    rating: number;
    content: string;
  };
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    const payload = await req.json() as ReviewPayload;
    const { record, type } = payload;

    // Only trigger on INSERT (new review created)
    if (type !== "INSERT") {
      return new Response(JSON.stringify({ message: "Not an insert" }), {
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log("New review created, checking if we should notify the other party");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if the OTHER person has also reviewed
    const { data: reviewCount } = await supabase
      .from("reviews")
      .select("id", { count: "exact" })
      .eq("sale_id", record.sale_id);

    // If this is the FIRST review (count = 1), notify the other party to also review
    if ((reviewCount?.length || 0) === 1) {
      console.log("First review - notifying the other party");

      // Fetch sale details to get product info
      const { data: saleData } = await supabase
        .from("sales")
        .select("id, buyer_id, seller_id, product_id")
        .eq("id", record.sale_id)
        .single();

      if (!saleData) {
        throw new Error("Sale not found");
      }

      // Fetch product details
      const { data: productData } = await supabase
        .from("products")
        .select("id, brand, model, type, price, image_urls")
        .eq("id", saleData.product_id)
        .single();

      if (!productData) {
        throw new Error("Product not found");
      }

      // Determine who to notify (the reviewee = the person who got reviewed = the one who needs to review back)
      const recipientId = record.reviewee_id;

      // Get recipient email
      const { data: recipientData } = await supabase.auth.admin.getUserById(recipientId);
      const recipientEmail = recipientData?.user.email;

      if (!recipientEmail) {
        console.log("No recipient email found");
        return new Response(JSON.stringify({ message: "No recipient email" }), {
          headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Get reviewer name
      const { data: reviewerData } = await supabase.rpc("get_user_username", {
        user_uuid: record.reviewer_id
      });
      const reviewerName = reviewerData?.username || "Den anden part";

      const productName = productData.brand && productData.model 
        ? `${productData.brand} ${productData.model}`
        : productData.type;

      // Setup transporter
      const transporter = nodemailer.createTransport({
        host: "smtp.simply.com",
        port: 587,
        secure: false,
        auth: {
          user: "gearninja@gearninja.dk",
          pass: Deno.env.get("SMTP_PASSWORD"),
        },
      });

      // Send email
      await transporter.sendMail({
        from: "Gearninja <noreply@gearninja.dk>",
        to: recipientEmail,
        subject: `${reviewerName} har anmeldt handlen`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Anmeldelse modtaget</title>
            </head>
            <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
              <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                
                <div style="background-color: #1a1a1a; padding: 24px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">Gearninja</h1>
                </div>

                <div style="padding: 32px 24px;">
                  <h2 style="margin-top: 0; color: #111827; font-size: 20px;">Anmeldelse modtaget</h2>
                  
                  <p style="color: #4b5563; margin-bottom: 24px;">
                    <strong>${reviewerName}</strong> har givet en anmeldelse af handlen med <strong>${productName}</strong>.
                  </p>

                  <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    ${productData.image_urls && productData.image_urls[0] ? `
                      <div style="width: 80px; height: 80px; border-radius: 6px; overflow: hidden; margin-bottom: 12px;">
                        <img src="${productData.image_urls[0]}" alt="${productName}" style="width: 100%; height: 100%; object-fit: cover;">
                      </div>
                    ` : ''}
                    <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #111827;">${productName}</h3>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Pris: ${productData.price} DKK</p>
                  </div>

                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                      <strong>Din tur:</strong> Giv også en anmeldelse af handlen.
                    </p>
                  </div>

                  <div style="text-align: center; margin-top: 32px;">
                    <a href="https://gearninja.dk/product/${productData.id}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">
                      Skriv anmeldelse
                    </a>
                  </div>
                </div>

                <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    © ${new Date().getFullYear()} Gearninja. Alle rettigheder forbeholdes.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log("Review notification email sent");
    } else {
      console.log("Both parties have reviewed - no notification needed");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
