import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import nodemailer from "npm:nodemailer@6.9.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload.record || payload;
    const { chat_id, sender_id, recipient_id, content } = record;

    console.log("Processing email notification for chat:", chat_id);

    // Fetch recipient's email
    const { data: recipientData, error: recipientError } = await supabase.auth.admin.getUserById(recipient_id);
    if (recipientError || !recipientData?.user?.email) {
      console.error("Could not fetch recipient email:", recipientError);
      return new Response(JSON.stringify({ skipped: true, reason: "Recipient not found" }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Fetch sender's username
    const { data: senderUsername } = await supabase.rpc("get_user_username", { user_uuid: sender_id });

    // Fetch chat details
    const { data: chatData } = await supabase
      .from("chats")
      .select("item_id, item_type, deleted_by_buyer, deleted_by_seller, buyer_id")
      .eq("id", chat_id)
      .single();

    if (!chatData) {
      console.log("Chat not found, skipping email");
      return new Response(JSON.stringify({ skipped: true, reason: "Chat not found" }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Check if recipient has deleted the chat
    const isRecipientBuyer = chatData.buyer_id === recipient_id;
    const hasDeletedChat = isRecipientBuyer ? chatData.deleted_by_buyer : chatData.deleted_by_seller;
    
    if (hasDeletedChat) {
      console.log("Recipient has deleted chat, skipping email");
      return new Response(JSON.stringify({ skipped: true, reason: "Chat deleted by recipient" }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
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
    const messagePreview = content.length > 100 ? content.substring(0, 100) + "..." : content;
    const chatUrl = `https://gearninja.vercel.app/chat/${chat_id}`;

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
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create transporter using nodemailer
    const transporter = nodemailer.createTransport({
      host: "smtp.simply.com",
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: "gearninja@gearninja.dk",
        pass: SMTP_PASSWORD,
      },
    });

    // Send email
    await transporter.sendMail({
      from: '"Gearninja" <gearninja@gearninja.dk>',
      to: recipientData.user.email,
      subject: `Ny besked fra ${senderName} om ${itemName}`,
      html: emailHtml,
    });

    console.log("Email sent successfully to:", recipientData.user.email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      skipped: true 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
