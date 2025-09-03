-- Fix security vulnerability: Restrict access to user queries
-- Add user_id column to associate queries with users when authenticated
ALTER TABLE public.queries 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update RLS policy to only allow reading own queries or service role access
DROP POLICY IF EXISTS "read own queries" ON public.queries;

-- Allow users to read only their own queries, or all queries if they're anonymous (no user_id)
CREATE POLICY "Users can read their own queries or anonymous queries" 
ON public.queries 
FOR SELECT 
USING (
  user_id IS NULL OR 
  user_id = auth.uid() OR 
  auth.role() = 'service_role'
);

-- Update insert policy to allow setting user_id for authenticated users
DROP POLICY IF EXISTS "insert queries anon" ON public.queries;

CREATE POLICY "Users can insert queries" 
ON public.queries 
FOR INSERT 
WITH CHECK (
  user_id IS NULL OR 
  user_id = auth.uid() OR 
  auth.role() = 'service_role'
);