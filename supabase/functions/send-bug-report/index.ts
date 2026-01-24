import nodemailer from "npm:nodemailer@6.9.7";

const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD")!;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://www.gearninja.dk",
  "https://gearninja.dk"
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: getCorsHeaders(origin),
    });
  }

  try {
    const { description, email, pageUrl, userAgent } = await req.json();

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Beskrivelse er påkrævet" }), {
        status: 400,
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Validate email if provided
    const userEmail = email && typeof email === "string" && email.includes("@") ? email.trim() : null;

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
          .header { background-color: #dc2626; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; }
          .content { padding: 40px 30px; background-color: #ffffff; }
          .label { font-weight: 600; color: #333; margin-bottom: 5px; }
          .value { background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; white-space: pre-wrap; word-break: break-word; }
          .email-box { background-color: #e0f2fe; padding: 12px 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #0284c7; }
          .meta { font-size: 12px; color: #666; background-color: #f0f0f0; padding: 10px 15px; border-radius: 4px; margin-top: 20px; }
          .footer { background-color: #f8f9fa; padding: 20px 30px; text-align: center; color: #666666; font-size: 13px; border-top: 1px solid #e0e0e0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐛 Ny Fejlrapport</h1>
          </div>
          <div class="content">
            ${userEmail ? `
            <p class="label">Fra bruger:</p>
            <div class="email-box">
              <a href="mailto:${userEmail}" style="color: #0284c7; text-decoration: none; font-weight: 500;">${userEmail}</a>
              <span style="color: #666; font-size: 12px; margin-left: 8px;">(klik for at svare)</span>
            </div>
            ` : `
            <p style="color: #999; font-style: italic; margin-bottom: 20px;">Ingen email angivet - kan ikke svare brugeren</p>
            `}
            
            <p class="label">Beskrivelse af fejl:</p>
            <div class="value">${description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            
            <div class="meta">
              <p style="margin: 5px 0;"><strong>Side:</strong> ${pageUrl || "Ikke angivet"}</p>
              <p style="margin: 5px 0;"><strong>Tidspunkt:</strong> ${new Date().toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" })}</p>
              <p style="margin: 5px 0; font-size: 11px;"><strong>Browser:</strong> ${userAgent || "Ikke angivet"}</p>
            </div>
          </div>
          <div class="footer">
            <p>Denne fejlrapport blev sendt fra GearNinja.dk</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create transporter using nodemailer
    const transporter = nodemailer.createTransport({
      host: "smtp.simply.com",
      port: 587,
      secure: false,
      auth: {
        user: "gearninja@gearninja.dk",
        pass: SMTP_PASSWORD,
      },
    });

    // Send email
    await transporter.sendMail({
      from: '"GearNinja Fejlrapport" <gearninja@gearninja.dk>',
      to: "gearninja@gearninja.dk",
      subject: userEmail ? `🐛 Fejlrapport fra ${userEmail}` : `🐛 Fejlrapport fra bruger`,
      html: emailHtml,
      replyTo: userEmail || "gearninja@gearninja.dk",
    });

    console.log("Bug report email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending bug report:", error);
    return new Response(JSON.stringify({ 
      error: "Kunne ikke sende fejlrapport. Prøv igen senere.",
    }), {
      status: 500,
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});
