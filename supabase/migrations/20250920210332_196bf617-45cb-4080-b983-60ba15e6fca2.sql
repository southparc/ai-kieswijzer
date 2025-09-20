-- Create tables for dual scoring system: program positions + voting behavior

-- Table for storing voting references (mapping statements to parliamentary votes)
CREATE TABLE IF NOT EXISTS public.voting_references (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  statement_id text NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  kamernummer text,
  link text,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table for storing actual voting results per party
CREATE TABLE IF NOT EXISTS public.party_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  party_name text NOT NULL,
  voting_reference_id uuid REFERENCES public.voting_references(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position IN (-1, 0, 1)), -- -1 = against, 0 = abstain, 1 = for
  note text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table for enhanced party positions (extends existing party data)
CREATE TABLE IF NOT EXISTS public.party_program_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  party_name text NOT NULL,
  statement_id text NOT NULL,
  position integer NOT NULL CHECK (position IN (-1, 0, 1)), -- -1 = disagree, 0 = neutral, 1 = agree
  confidence numeric DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  evidence_refs text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(party_name, statement_id)
);

-- Enable RLS on all tables
ALTER TABLE public.voting_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_program_positions ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (voting behavior is public information)
CREATE POLICY "Everyone can read voting references" ON public.voting_references
  FOR SELECT USING (true);

CREATE POLICY "Everyone can read party votes" ON public.party_votes
  FOR SELECT USING (true);

CREATE POLICY "Everyone can read party program positions" ON public.party_program_positions
  FOR SELECT USING (true);

-- Create policies for service role management
CREATE POLICY "Service role can manage voting references" ON public.voting_references
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage party votes" ON public.party_votes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage party program positions" ON public.party_program_positions
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voting_references_statement ON public.voting_references(statement_id);
CREATE INDEX IF NOT EXISTS idx_party_votes_party ON public.party_votes(party_name);
CREATE INDEX IF NOT EXISTS idx_party_votes_reference ON public.party_votes(voting_reference_id);
CREATE INDEX IF NOT EXISTS idx_party_program_positions_party ON public.party_program_positions(party_name);
CREATE INDEX IF NOT EXISTS idx_party_program_positions_statement ON public.party_program_positions(statement_id);

-- Function to get party voting behavior for a statement
CREATE OR REPLACE FUNCTION public.get_party_voting_behavior(target_statement_id text)
RETURNS TABLE(
  party_name text,
  position integer,
  vote_title text,
  vote_date date,
  kamernummer text,
  vote_link text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    pv.party_name,
    pv.position,
    vr.title as vote_title,
    vr.date as vote_date,
    vr.kamernummer,
    vr.link as vote_link
  FROM public.party_votes pv
  JOIN public.voting_references vr ON vr.id = pv.voting_reference_id
  WHERE vr.statement_id = target_statement_id
  ORDER BY pv.party_name;
$$;

-- Function to get comprehensive party positions (program + voting)
CREATE OR REPLACE FUNCTION public.get_party_dual_positions(target_party_name text)
RETURNS TABLE(
  statement_id text,
  program_position integer,
  program_confidence numeric,
  voting_position integer,
  vote_count integer,
  latest_vote_date date
)
LANGUAGE sql
STABLE SECURITY DEFINER  
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(ppp.statement_id, vr.statement_id) as statement_id,
    ppp.position as program_position,
    ppp.confidence as program_confidence,
    pv.position as voting_position,
    COUNT(pv.id) as vote_count,
    MAX(vr.date) as latest_vote_date
  FROM public.party_program_positions ppp
  FULL OUTER JOIN (
    SELECT vr.statement_id, pv.party_name, pv.position, vr.date, pv.id
    FROM public.voting_references vr
    JOIN public.party_votes pv ON pv.voting_reference_id = vr.id
    WHERE pv.party_name = target_party_name
  ) pv ON pv.statement_id = ppp.statement_id AND pv.party_name = ppp.party_name
  FULL OUTER JOIN public.voting_references vr ON vr.statement_id = COALESCE(ppp.statement_id, pv.statement_id)
  WHERE (ppp.party_name = target_party_name OR pv.party_name = target_party_name)
  GROUP BY ppp.statement_id, vr.statement_id, ppp.position, ppp.confidence, pv.position
  ORDER BY statement_id;
$$;