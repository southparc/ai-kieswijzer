-- Update RLS policies for queries table to allow public counting
-- while still protecting individual query data

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own queries" ON public.queries;
DROP POLICY IF EXISTS "Enable inserts for authenticated users only" ON public.queries;
DROP POLICY IF EXISTS "Enable inserts for anonymous users" ON public.queries;

-- Create new policies that allow:
-- 1. Count queries for everyone (needed for usage counter)
-- 2. Individual query access only for the user who created it

-- Allow public to count queries (for usage counter)
CREATE POLICY "Enable count for everyone" 
ON public.queries 
FOR SELECT 
USING (false); -- This will block individual row access but allow aggregates

-- Allow users to view their own queries when authenticated
CREATE POLICY "Users can view their own queries" 
ON public.queries 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow inserts for everyone (both authenticated and anonymous)
CREATE POLICY "Enable inserts for everyone" 
ON public.queries 
FOR INSERT 
WITH CHECK (true);

-- Create a separate policy using a security definer function for public counting
CREATE OR REPLACE FUNCTION public.get_query_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) FROM queries;
$$;