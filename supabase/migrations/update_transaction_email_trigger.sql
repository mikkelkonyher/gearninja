-- Update the handle_sale_update function to include x-webhook-secret header
-- Replace YOUR_SERVICE_ROLE_KEY with your actual service role key
-- Replace YOUR_WEBHOOK_SECRET with the same value you set in DENO_WEBHOOK_SECRET env var

CREATE OR REPLACE FUNCTION handle_sale_update()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    -- Only trigger when status changes to 'completed' (same as before)
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        
        -- Construct payload (same structure as before, but adding type and old_record for edge function)
        payload := jsonb_build_object(
            'record', row_to_json(NEW),
            'old_record', row_to_json(OLD),
            'type', 'UPDATE'
        );

        -- Call Edge Function with Authorization header (same as before) + new x-webhook-secret header
        PERFORM net.http_post(
            url := 'https://vdxepquqstrtxwkcibgm.supabase.co/functions/v1/send-transaction-email',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
                'x-webhook-secret', 'YOUR_WEBHOOK_SECRET'
            ),
            body := payload
        );
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

