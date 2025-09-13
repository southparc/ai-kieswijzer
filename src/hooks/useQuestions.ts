import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Question } from '@/components/QuizInterface';

export interface DatabaseQuestion {
  id: number;
  statement: string;
  category: string;
  description: string;
  order_index: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useQuestions = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .eq('active', true)
        .order('order_index');

      if (fetchError) {
        throw fetchError;
      }

      // Convert database questions to Question format
      const formattedQuestions: Question[] = data.map((dbQuestion) => ({
        id: dbQuestion.id,
        statement: dbQuestion.statement,
        category: dbQuestion.category,
        description: dbQuestion.description
      }));

      setQuestions(formattedQuestions);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  return { questions, loading, error, refetch: fetchQuestions };
};