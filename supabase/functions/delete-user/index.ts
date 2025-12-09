import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://www.gearninja.dk"
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the auth header
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Create admin client to delete user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Delete user's products
    const { error: productsError } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('user_id', user.id)

    if (productsError) {
      console.error('Error deleting products:', productsError)
    }

    // Delete user's rehearsal rooms
    const { error: roomsError } = await supabaseAdmin
      .from('rehearsal_rooms')
      .delete()
      .eq('user_id', user.id)

    if (roomsError) {
      console.error('Error deleting rehearsal rooms:', roomsError)
    }

    // Delete user's profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
    }

    // Delete user from auth
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id
    )

    if (deleteUserError) {
      return new Response(
        JSON.stringify({ error: deleteUserError.message }),
        {
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }),
      {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
