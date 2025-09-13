import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUsageCount = () => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsageCount = async () => {
      try {
        const { count: queryCount, error } = await supabase
          .from('queries')
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error('Error fetching usage count:', error);
          return;
        }

        setCount(queryCount || 0);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsageCount();
  }, []);

  return { count, loading };
};