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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    // Fetch unprocessed emails from queue
    const { data: queueItems, error: queueError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("processed", false)
      .order("created_at", { ascending: true })
      .limit(10); // Process 10 at a time

    if (queueError) {
      throw queueError;
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: "No emails to process" }), {
        status: 200,
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const item of queueItems) {
      try {
        // Fetch recipient's email
        const { data: recipientData, error: recipientError } = await supabase.auth.admin.getUserById(item.recipient_id);
        if (recipientError || !recipientData?.user?.email) {
          console.error("Could not fetch recipient email:", recipientError);
          // Mark as processed even if failed to avoid retry loop
          await supabase.from("email_queue").update({ processed: true }).eq("id", item.id);
          continue;
        }

        // Fetch sender's username
        const { data: senderUsername } = await supabase.rpc("get_user_username", {
          user_uuid: item.sender_id,
        });

        // Fetch chat details
        const { data: chatData } = await supabase
          .from("chats")
          .select("item_id, item_type, deleted_by_buyer, deleted_by_seller, buyer_id")
          .eq("id", item.chat_id)
          .single();

        if (!chatData) {
          await supabase.from("email_queue").update({ processed: true }).eq("id", item.id);
          continue;
        }

        // Check if recipient has deleted the chat
        const isRecipientBuyer = chatData.buyer_id === item.recipient_id;
        const hasDeletedChat = isRecipientBuyer ? chatData.deleted_by_buyer : chatData.deleted_by_seller;
        
        if (hasDeletedChat) {
          await supabase.from("email_queue").update({ processed: true }).eq("id", item.id);
          continue;
        }

        // Fetch item name
        let itemName = "et produkt";
        if (chatData.item_type === "product") {
          const { data: productData } = await supabase
            .from("products")
            .select("brand, model, type")
            .eq("id", chatData.item_id)
            .single();

          if (productData) {
            itemName = productData.brand && productData.model
              ? `${productData.brand} ${productData.model}`
              : productData.type || "et produkt";
          }
        } else {
          const { data: roomData } = await supabase
            .from("rehearsal_rooms")
            .select("name, type")
            .eq("id", chatData.item_id)
            .single();

          if (roomData) {
            itemName = roomData.name || roomData.type || "et øvelokale";
          }
        }

        const senderName = senderUsername?.username || "En bruger";
        const messagePreview = item.content.length > 100 ? item.content.substring(0, 100) + "..." : item.content;
        const chatUrl = `https://gearninja.dk/chat/${item.chat_id}`;

        // Create email HTML
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #00FFFF; color: #000; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; margin: 0; border-radius: 0 0 8px 8px; }
              .message-box { background: white; padding: 20px; border-left: 4px solid #00FFFF; margin: 20px 0; border-radius: 4px; }
              .button { display: inline-block; padding: 14px 28px; background: #00FFFF; color: #000; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Gearninja</h1>
              </div>
              <div class="content">
                <h2 style="color: #333; margin-top: 0;">Ny besked fra ${senderName}</h2>
                <p style="color: #666;">Du har modtaget en ny besked om <strong>${itemName}</strong>:</p>
                <div class="message-box">
                  <p style="margin: 0; color: #333;">"${messagePreview}"</p>
                </div>
                <div style="text-align: center;">
                  <a href="${chatUrl}" class="button">Læs og svar på beskeden</a>
                </div>
                <div class="footer">
                  <p>Dette er en automatisk besked fra Gearninja</p>
                  <p>Du modtager denne email fordi du har en aktiv samtale på platformen</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        // Send email using Supabase's SMTP
        const { error: emailError } = await fetch(`${SUPABASE_URL}/auth/v1/mail`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            to: recipientData.user.email,
            subject: `Ny besked fra ${senderName} om ${itemName}`,
            html: emailHtml,
          }),
        });

        // Mark as processed
        await supabase.from("email_queue").update({ processed: true }).eq("id", item.id);

        results.push({
          id: item.id,
          success: !emailError,
          recipient: recipientData.user.email,
        });
      } catch (error) {
        console.error("Error processing email:", error);
        // Mark as processed to avoid infinite retry
        await supabase.from("email_queue").update({ processed: true }).eq("id", item.id);
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in process-email-queue function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
