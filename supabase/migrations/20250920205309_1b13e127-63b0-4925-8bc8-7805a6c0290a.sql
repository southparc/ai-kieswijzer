-- Fix function search path security issues
CREATE OR REPLACE FUNCTION public.analyze_chunk_quality(content_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_chars integer;
  non_alpha_chars integer;
  quality_score numeric;
  has_artifacts boolean;
BEGIN
  total_chars := length(content_text);
  
  IF total_chars = 0 THEN
    RETURN jsonb_build_object(
      'quality_score', 0,
      'has_artifacts', true,
      'reason', 'empty_content'
    );
  END IF;
  
  -- Count non-alphabetic/numeric characters (excluding common punctuation)
  non_alpha_chars := length(regexp_replace(content_text, '[[:alnum:][:space:].,;:!?()\[\]""''–—-]', '', 'g'));
  
  -- Calculate quality score (0-1)
  quality_score := GREATEST(0, 1 - (non_alpha_chars::numeric / total_chars * 3));
  
  -- Check for OCR artifacts
  has_artifacts := (
    content_text ~ '[ﬁﬂ]' OR  -- Ligatures
    content_text ~ '\u00AD' OR  -- Soft hyphens
    (non_alpha_chars::numeric / total_chars) > 0.05  -- >5% non-standard chars
  );
  
  RETURN jsonb_build_object(
    'quality_score', quality_score,
    'has_artifacts', has_artifacts,
    'non_alpha_ratio', non_alpha_chars::numeric / total_chars,
    'total_chars', total_chars
  );
END;
$$;

-- Update RPC function for enhanced RAG search with proper security
CREATE OR REPLACE FUNCTION public.rag_topk_themed(
  q_embedding vector, 
  theme_filter text DEFAULT NULL,
  k integer DEFAULT 12
)
RETURNS TABLE(content text, page integer, party text, title text, url text, theme text, quality numeric)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    c.content, 
    c.page, 
    d.party, 
    d.title, 
    d.url,
    COALESCE(c.metadata->>'theme', 'algemeen') as theme,
    COALESCE((c.metadata->>'quality')::numeric, 1.0) as quality
  FROM public.chunks c
  JOIN public.documents d ON d.id = c.document_id
  WHERE (theme_filter IS NULL OR (c.metadata->>'theme' = theme_filter))
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <#> q_embedding
  LIMIT k
$$;

-- Update party coverage statistics function with proper security
CREATE OR REPLACE FUNCTION public.get_party_coverage_stats()
RETURNS TABLE(
  party text, 
  total_chunks integer, 
  avg_quality numeric, 
  themes jsonb,
  artifact_percentage numeric
)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    d.party,
    COUNT(c.id)::integer as total_chunks,
    AVG(COALESCE((c.metadata->>'quality')::numeric, 1.0)) as avg_quality,
    jsonb_agg(DISTINCT c.metadata->>'theme') FILTER (WHERE c.metadata->>'theme' IS NOT NULL) as themes,
    (COUNT(*) FILTER (WHERE (c.metadata->>'has_artifacts')::boolean = true) * 100.0 / COUNT(*)) as artifact_percentage
  FROM public.documents d
  JOIN public.chunks c ON c.document_id = d.id
  GROUP BY d.party
  ORDER BY d.party
$$;