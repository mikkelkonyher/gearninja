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
    const chatUrl = `https://gearninja.dk/chat/${chat_id}`;

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #4A90E2; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: 0.5px; }
          .content { padding: 40px 30px; background-color: #ffffff; }
          .greeting { color: #333333; font-size: 18px; margin-bottom: 20px; }
          .message-box { background-color: #f8f9fa; padding: 20px; border-left: 4px solid #4A90E2; margin: 25px 0; border-radius: 4px; }
          .message-text { margin: 0; color: #555555; font-style: italic; }
          .button-container { text-align: center; margin: 30px 0; }
          .button { display: inline-block; padding: 14px 32px; background-color: #4A90E2; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 16px; }
          .button:hover { background-color: #357ABD; }
          .footer { background-color: #f8f9fa; padding: 20px 30px; text-align: center; color: #666666; font-size: 13px; border-top: 1px solid #e0e0e0; }
          .footer p { margin: 5px 0; }
          @media only screen and (max-width: 600px) {
            .content { padding: 30px 20px; }
            .button { display: block; margin: 20px auto; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Gearninja</h1>
          </div>
          <div class="content">
            <p class="greeting">Hej,</p>
            <p style="color: #555555; margin-bottom: 20px;">Du har modtaget en ny besked fra <strong>${senderName}</strong> vedrørende <strong>${itemName}</strong>:</p>
            <div class="message-box">
              <p class="message-text">"${messagePreview}"</p>
            </div>
            <div class="button-container">
              <a href="${chatUrl}" class="button">Læs og svar på beskeden</a>
            </div>
            <p style="color: #666666; font-size: 14px; margin-top: 30px;">Klik på knappen ovenfor for at se hele beskeden og svare.</p>
          </div>
          <div class="footer">
            <p>Dette er en automatisk besked fra Gearninja</p>
            <p style="margin-top: 10px;">© ${new Date().getFullYear()} Gearninja. Alle rettigheder forbeholdes.</p>
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
