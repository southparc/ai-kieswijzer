-- Add INSERT policies for service role to allow ingest function to write data

-- Allow service role to insert documents
CREATE POLICY "Service role can insert documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role'::text);

-- Allow service role to insert chunks  
CREATE POLICY "Service role can insert chunks"
ON public.chunks
FOR INSERT 
WITH CHECK (auth.role() = 'service_role'::text);