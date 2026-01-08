import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

Deno.serve(async (req) => {
  // Shared-secret guard so only our cron/scheduler can call this
  const SECRET = Deno.env.get("DENO_WEBHOOK_SECRET");
  const incoming = req.headers.get("x-webhook-secret");

  if (!SECRET || incoming !== SECRET) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the handle_soft_deletions function
    const { data, error } = await supabase.rpc('handle_soft_deletions')

    if (error) {
      console.error('Error calling handle_product_lifecycle:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Product lifecycle handled successfully:', data)
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
