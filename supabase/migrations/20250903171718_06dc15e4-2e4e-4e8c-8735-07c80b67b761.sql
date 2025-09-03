-- Enable RLS on all tables that don't have it enabled
ALTER TABLE public.ingest_log ENABLE ROW LEVEL SECURITY;

-- Create a basic RLS policy for ingest_log (service role only since it's for system operations)
CREATE POLICY "Service role can manage ingest_log" 
ON public.ingest_log 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');