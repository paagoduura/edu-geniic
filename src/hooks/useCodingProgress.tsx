import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CodingProgressEntry {
  id: string;
  language: string;
  topic_title: string;
  level: string;
  solved_problems: number;
  total_problems: number;
  is_completed: boolean;
  completed_at: string | null;
}

export const useCodingProgress = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<CodingProgressEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('coding_progress')
      .select('*')
      .eq('student_id', user.id);
    setProgress((data as CodingProgressEntry[]) || []);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const saveProgress = useCallback(async (
    language: string,
    topicTitle: string,
    level: string,
    solvedProblems: number,
    totalProblems: number
  ) => {
    if (!user) return;
    const isCompleted = solvedProblems >= totalProblems;
    
    const { error } = await supabase
      .from('coding_progress')
      .upsert({
        student_id: user.id,
        language,
        topic_title: topicTitle,
        level,
        solved_problems: solvedProblems,
        total_problems: totalProblems,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id,language,topic_title' });

    if (!error) fetchProgress();
  }, [user, fetchProgress]);

  const getTopicProgress = useCallback((language: string, topicTitle: string) => {
    return progress.find(p => p.language === language && p.topic_title === topicTitle);
  }, [progress]);

  const getLanguageStats = useCallback((language: string) => {
    const langProgress = progress.filter(p => p.language === language);
    const completed = langProgress.filter(p => p.is_completed).length;
    return { total: langProgress.length, completed };
  }, [progress]);

  const totalCompleted = progress.filter(p => p.is_completed).length;

  return { progress, isLoading, saveProgress, getTopicProgress, getLanguageStats, totalCompleted, fetchProgress };
};
