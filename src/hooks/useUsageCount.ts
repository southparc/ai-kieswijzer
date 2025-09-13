import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUsageCount = () => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUsageCount = async () => {
      try {
        const { count: queryCount, error } = await supabase
          .from('queries')
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error('Error fetching usage count:', error);
          return;
        }
        if (!isMounted) return;
        setCount(queryCount || 0);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Initial fetch
    fetchUsageCount();

    // Poll every 10s to keep it updated
    const intervalId = setInterval(fetchUsageCount, 10000);

    // Try realtime updates if enabled
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'queries' },
        () => setCount((c) => c + 1)
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, []);

  return { count, loading };
};