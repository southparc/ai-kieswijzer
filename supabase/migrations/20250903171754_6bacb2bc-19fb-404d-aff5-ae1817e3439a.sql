-- Fix function search path security issues
-- Update insert_chunk_with_vector function with proper search_path
CREATE OR REPLACE FUNCTION public.insert_chunk_with_vector(p_document_id uuid, p_page integer, p_content text, p_tokens integer, p_embedding vector)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  insert into public.chunks(document_id, page, content, tokens, embedding)
  values (p_document_id, p_page, p_content, p_tokens, p_embedding);
end$function$;

-- Update rag_topk function with proper search_path  
CREATE OR REPLACE FUNCTION public.rag_topk(q_embedding vector, k integer DEFAULT 12)
RETURNS TABLE(content text, page integer, party text, title text, url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  select c.content, c.page, d.party, d.title, d.url
  from public.chunks c
  join public.documents d on d.id = c.document_id
  order by c.embedding <#> q_embedding
  limit k
$function$;