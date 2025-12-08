-- Create a trigger to send an email when a sale is completed using pg_net (standard Supabase pattern)
-- Note: Requires pg_net extension enabled

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION handle_sale_update()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    -- Only trigger when status changes to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        
        -- Construct payload
        payload := jsonb_build_object(
            'record', row_to_json(NEW)
        );

        -- Call Edge Function
        -- Replace PROJECT_REF with your actual Supabase project ref if known, or use the general URL
        -- For robust setups, we use net.http_post to call the function
        -- Ensure you have the correct Authorization header with the service key
        
        -- IMPORTANT: In a real migration we need the URL and Key. 
        -- Since we can't hardcode secrets in migrations easily, we often use a webhook in the dashboard 
        -- OR use a Vault/Secrets lookup.
        
        -- For this implementation, I will assume the USER sets up a Database Webhook in the Dashboard
        -- OR we can use a simpler approach: triggering an internal notification that an Edge Function watches?
        
        -- ACTUALLY, the most robust way without hardcoding secrets in SQL is to use Supabase's built-in "Database Webhooks" feature in the UI.
        -- BUT, I can provide the SQL to create the webhook if I check the `supabase_functions` schema, but that's complex.
        
        -- SIMPLER ALTERNATIVE FOR SQL ONLY:
        -- Use `pg_net` with a placeholder key. The user will need to replace it.
        -- OR: Just return NEW and let the user set up the webhook in the UI (easiest for them).
        
        -- Let's try to do it via `pg_net` if possible, but retrieving the SERVICE_KEY from inside SQL is unsafe/hard.
        
        -- DECISION: I will create the FUNCTION `handle_sale_update` but comment out the `pg_net` call 
        -- and instruct the user to set up a "Database Webhook" in the Supabase Dashboard which is the official recommended way for this.
        -- Triggering an edge function from SQL directly usually requires hardcoded keys.
        
        -- WAIT! I can use `supabase_functions.http_request` if available? No, that's not standard.
        
        -- Let's stick to the Plan: I will provide the Trigger logic to detecting the change, 
        -- but the actual CALL to the Edge Function is best configured via the UI Webhook for security (no keys in code).
        
        NULL; -- Do nothing in SQL, let webhook handle it? 
        -- Actually, I will create the trigger but leave the implementation empty
        -- and ask the user to add the Webhook in the dashboard.
        
        -- REVISED PLAN: I will create a trigger that inserts into a new 'email_queue' table, 
        -- OR I will instruct the user to add the webhook.
        
        -- Let's try the direct HTTP call method using a vault secret if possible? No.

        -- BEST PATH: Provide SQL to creating the trigger that calls the function IF they replace the URL/Key.
        -- But that's error prone.
        
        -- Let's look at `send-message-email`. How is that triggered? 
        -- Ah, that's triggered by client or server code manually? 
        -- "send-message-email" seems to be called manually.
        
        -- I will UPDATE the "confirm_sale" function to call the Edge Function directly via `pg_net` if the user provides the key,
        -- OR simpler: use the existing `confirm_sale` RPC to return the info needed for the client to call the email? 
        -- No, that trusts the client too much.

        -- OK, I will try to use the `net.http_post` with a placeholder and ask user to fill it.
        
        PERFORM net.http_post(
            url := 'https://vdxepquqstrtxwkcibgm.supabase.co/functions/v1/send-transaction-email',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
            body := payload
        );
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_sale_completed
    AFTER UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION handle_sale_update();
