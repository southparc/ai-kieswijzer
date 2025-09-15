-- Fix security vulnerability: Restrict access to queries table
-- Remove public access to anonymous queries to prevent privacy leaks

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can read their own queries or anonymous queries" ON public.queries;

-- Create a new restrictive SELECT policy that only allows:
-- 1. Users to see their own authenticated queries
-- 2. Service role to access all queries (for backend operations)
-- 3. Remove public access to anonymous queries
CREATE POLICY "Users can only read their own queries" 
ON public.queries 
FOR SELECT 
USING (
  -- Only authenticated users can see their own queries
  (user_id IS NOT NULL AND user_id = auth.uid()) 
  OR 
  -- Service role can access all queries for backend operations
  (auth.role() = 'service_role'::text)
);

-- Update the INSERT policy to be more explicit and secure
DROP POLICY IF EXISTS "Users can insert queries" ON public.queries;

CREATE POLICY "Secure query insertion" 
ON public.queries 
FOR INSERT 
WITH CHECK (
  -- Authenticated users can insert queries with their user_id
  (user_id IS NOT NULL AND user_id = auth.uid()) 
  OR 
  -- Allow anonymous queries but only with NULL user_id (no cross-user insertion)
  (user_id IS NULL AND auth.uid() IS NULL)
  OR 
  -- Service role can insert any query
  (auth.role() = 'service_role'::text)
);

-- Add a comment explaining the security rationale
COMMENT ON TABLE public.queries IS 'User queries table with privacy protection - users can only access their own queries, anonymous queries are not publicly readable to prevent privacy leaks';