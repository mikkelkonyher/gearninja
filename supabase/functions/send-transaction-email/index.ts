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

interface EmailPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  record: {
    id: string; // sale_id
    product_id: string;
    buyer_id: string;
    seller_id: string;
    status: string;
  };
  old_record?: {
    status: string;
  };
}

function generateBuyerSelectedEmail(productName: string, sellerName: string, product: any, price: number, productId: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Du er valgt som køber</title>
      </head>
      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <div style="background-color: #1a1a1a; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">Gearninja</h1>
          </div>

          <div style="padding: 32px 24px;">
            <h2 style="margin-top: 0; color: #111827; font-size: 20px;">Du er valgt som køber!</h2>
            
            <p style="color: #4b5563; margin-bottom: 24px;">
              <strong>${sellerName}</strong> har valgt dig som køber af <strong>${productName}</strong>.
            </p>

            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              ${product.image_urls && product.image_urls[0] ? `
                <div style="width: 80px; height: 80px; border-radius: 6px; overflow: hidden; margin-bottom: 12px;">
                  <img src="${product.image_urls[0]}" alt="${productName}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
              ` : ''}
              <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #111827;">${productName}</h3>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Pris: ${price} DKK</p>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 24px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Næste skridt:</strong> Bekræft købet for at gennemføre handlen.
              </p>
            </div>

            <div style="text-align: center; margin-top: 32px;">
              <a href="https://gearninja.dk/product/${productId}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">
                Bekræft køb
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
  `;
}

function generateBuyerConfirmedEmail(productName: string, buyerName: string, product: any, price: number) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Køb bekræftet</title>
      </head>
      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <div style="background-color: #1a1a1a; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">Gearninja</h1>
          </div>

          <div style="padding: 32px 24px;">
            <h2 style="margin-top: 0; color: #111827; font-size: 20px;">Salg gennemført</h2>
            
            <p style="color: #4b5563; margin-bottom: 24px;">
              <strong>${buyerName}</strong> har bekræftet købet af <strong>${productName}</strong>.
            </p>

            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              ${product.image_urls && product.image_urls[0] ? `
                <div style="width: 80px; height: 80px; border-radius: 6px; overflow: hidden; margin-bottom: 12px;">
                  <img src="${product.image_urls[0]}" alt="${productName}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
              ` : ''}
              <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #111827;">${productName}</h3>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Solgt for: ${price} DKK</p>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 24px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Næste skridt:</strong> Giv en anmeldelse af handlen.
              </p>
            </div>

            <div style="text-align: center; margin-top: 32px;">
              <a href="https://gearninja.dk/mine-annoncer" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">
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
  `;
}

function generateBuyerDeclinedEmail(productName: string, buyerName: string, product: any, price: number, productId: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Køber har afvist</title>
      </head>
      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <div style="background-color: #1a1a1a; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">Gearninja</h1>
          </div>

          <div style="padding: 32px 24px;">
            <h2 style="margin-top: 0; color: #111827; font-size: 20px;">Køber har afvist købet</h2>
            
            <p style="color: #4b5563; margin-bottom: 24px;">
              <strong>${buyerName}</strong> har desværre afvist købet af <strong>${productName}</strong>.
            </p>

            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              ${product.image_urls && product.image_urls[0] ? `
                <div style="width: 80px; height: 80px; border-radius: 6px; overflow: hidden; margin-bottom: 12px;">
                  <img src="${product.image_urls[0]}" alt="${productName}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
              ` : ''}
              <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #111827;">${productName}</h3>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Pris: ${price} DKK</p>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 24px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Næste skridt:</strong> Dit produkt er nu tilgængeligt igen. Du kan vælge en anden køber eller vente på nye interesserede.
              </p>
            </div>

            <div style="text-align: center; margin-top: 32px;">
              <a href="https://gearninja.dk/product/${productId}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">
                Se produkt
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
  `;
}


serve(async (req) => {
  const origin = req.headers.get("Origin");
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  // Shared-secret guard so only our DB webhook/trigger can call this
  const SECRET = Deno.env.get("DENO_WEBHOOK_SECRET");
  const incoming = req.headers.get("x-webhook-secret");

  if (!SECRET || incoming !== SECRET) {
    return new Response("Unauthorized", {
      status: 401,
      headers: getCorsHeaders(origin),
    });
  }

  try {
    const payload = await req.json() as EmailPayload;
    const { record, old_record, type } = payload;

    console.log("Webhook type:", type);
    console.log("Record status:", record.status);
    console.log("Old record status:", old_record?.status);

    // Determine which email to send based on the event type
    let emailType: "buyer_selected" | "buyer_confirmed" | "buyer_declined" | null = null;

    if (type === "INSERT" && record.status === "pending") {
      // Seller just selected a buyer
      emailType = "buyer_selected";
    } else if (type === "UPDATE" && record.status === "completed" && old_record?.status !== "completed") {
      // Buyer just confirmed the purchase
      emailType = "buyer_confirmed";
    } else if (type === "UPDATE" && record.status === "cancelled" && old_record?.status === "pending") {
      // Buyer just declined the purchase
      emailType = "buyer_declined";
    }

    if (!emailType) {
      console.log("Skipping: Not a relevant event");
      return new Response(JSON.stringify({ message: "Not a relevant event" }), {
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    console.log("Email type:", emailType);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch Sale Details (simple, no joins)
    const { data: salesData, error: saleError } = await supabase
      .from("sales")
      .select("id, buyer_id, seller_id, product_id")
      .eq("id", record.id);

    console.log("Sales query result:", salesData);
    console.log("Sales count:", salesData?.length);

    if (saleError || !salesData || salesData.length === 0) {
      console.error("Error fetching sale details:", saleError);
      console.error("Sale ID:", record.id);
      console.error("Sale data:", salesData);
      throw new Error(`Could not fetch sale details: ${saleError?.message || 'No data returned'}`);
    }

    const saleData = salesData[0]; // Take first result

    // 2. Fetch product details
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("id, brand, model, type, price, image_urls")
      .eq("id", saleData.product_id)
      .single();

    if (productError || !productData) {
      console.error("Error fetching product:", productError);
      throw new Error("Could not fetch product details");
    }

    // 3. Fetch buyer email from auth.users
    const { data: buyerData, error: buyerError } = await supabase.auth.admin.getUserById(
      saleData.buyer_id
    );

    if (buyerError || !buyerData) {
      console.error("Error fetching buyer:", buyerError);
      throw new Error("Could not fetch buyer details");
    }

    // 4. Fetch seller username
    const { data: sellerData } = await supabase.rpc("get_user_username", {
      user_uuid: saleData.seller_id
    });

    const product = productData;
    const buyerEmail = buyerData.user.email;
    const sellerName = sellerData?.username || "Sælger";
    
    // Construct product name
    const productName = product.brand && product.model 
      ? `${product.brand} ${product.model}`
      : product.type;

    const price = product.price; // Use list price or agreed price if available

    if (!buyerEmail) {
      console.error("No buyer email found");
      return new Response(JSON.stringify({ message: "No buyer email found" }), {
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
        status: 200, 
      });
    }

    // Setup Transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.simply.com",
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: "gearninja@gearninja.dk",
        pass: Deno.env.get("SMTP_PASSWORD"),
      },
    });

    // Send different emails based on the type
    let emailInfo;

    if (emailType === "buyer_selected") {
      // Email to BUYER: You've been selected!
      emailInfo = await transporter.sendMail({
        from: "Gearninja <noreply@gearninja.dk>",
        to: buyerEmail,
        subject: `Du er valgt som køber: ${productName}`,
        html: generateBuyerSelectedEmail(productName, sellerName, product, price, product.id),
      });
    } else if (emailType === "buyer_confirmed") {
      // Email to SELLER: Buyer confirmed! Write a review
      const { data: sellerUserData } = await supabase.auth.admin.getUserById(saleData.seller_id);
      const sellerEmail = sellerUserData?.user.email;

      if (!sellerEmail) {
        console.error("No seller email found");
        return new Response(JSON.stringify({ message: "No seller email found" }), {
          headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
          status: 200,
        });
      }

      const { data: buyerNameData } = await supabase.rpc("get_user_username", {
        user_uuid: saleData.buyer_id
      });
      const buyerName = buyerNameData?.username || "Køber";

      emailInfo = await transporter.sendMail({
        from: "Gearninja <noreply@gearninja.dk>",
        to: sellerEmail,
        subject: `Køb bekræftet: ${productName}`,
        html: generateBuyerConfirmedEmail(productName, buyerName, product, price),
      });
    } else if (emailType === "buyer_declined") {
      // Email to SELLER: Buyer declined
      const { data: sellerUserData } = await supabase.auth.admin.getUserById(saleData.seller_id);
      const sellerEmail = sellerUserData?.user.email;

      if (!sellerEmail) {
        console.error("No seller email found");
        return new Response(JSON.stringify({ message: "No seller email found" }), {
          headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
          status: 200,
        });
      }

      const { data: buyerNameData } = await supabase.rpc("get_user_username", {
        user_uuid: saleData.buyer_id
      });
      const buyerName = buyerNameData?.username || "Køber";

      emailInfo = await transporter.sendMail({
        from: "Gearninja <noreply@gearninja.dk>",
        to: sellerEmail,
        subject: `Køber har afvist: ${productName}`,
        html: generateBuyerDeclinedEmail(productName, buyerName, product, price, product.id),
      });
    }

    console.log("Email sent:", emailInfo);

    return new Response(JSON.stringify(emailInfo), {
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
