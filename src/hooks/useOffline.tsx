import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  initOfflineDB,
  cacheLessons,
  getCachedLessons,
  cacheQuiz,
  getCachedQuizzes,
  addPendingSync,
  getPendingSync,
  removePendingSync,
  cacheUserData,
  getCachedUserData,
  getCacheStats,
  clearOldCache,
} from '@/lib/offlineStorage';

interface UseOfflineReturn {
  isOnline: boolean;
  isInitialized: boolean;
  pendingSyncCount: number;
  cacheStats: {
    lessonCount: number;
    quizCount: number;
    pendingSyncCount: number;
    totalSize: string;
  } | null;
  syncNow: () => Promise<void>;
  downloadForOffline: (userId: string) => Promise<void>;
  isSyncing: boolean;
  isDownloading: boolean;
}

export const useOffline = (): UseOfflineReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [cacheStats, setCacheStats] = useState<UseOfflineReturn['cacheStats']>(null);
  const { toast } = useToast();

  // Initialize offline DB
  useEffect(() => {
    const init = async () => {
      try {
        await initOfflineDB();
        await clearOldCache();
        await updateCacheStats();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize offline DB:', error);
      }
    };
    init();
  }, []);

  const updateCacheStats = useCallback(async () => {
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
      setPendingSyncCount(stats.pendingSyncCount);
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    }
  }, []);

  // Sync pending data to server
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const pendingItems = await getPendingSync();

      for (const item of pendingItems) {
        try {
          let error = null;

          switch (item.type) {
            case 'quiz_result':
              ({ error } = await supabase
                .from('quizzes')
                .update(item.data.update)
                .eq('id', item.data.quizId));
              break;
            case 'performance':
              ({ error } = await supabase.from('performance').insert(item.data));
              break;
            case 'streak':
              ({ error } = await supabase.rpc('update_learning_streak', { user_id: item.data.userId }));
              break;
          }

          if (error) throw error;
          await removePendingSync(item.id);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
        }
      }

      await updateCacheStats();

      if (pendingItems.length > 0) {
        toast({
          title: 'Sync Complete',
          description: `${pendingItems.length} item(s) synced successfully.`,
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: 'Sync Failed',
        description: 'We\'ll try again when connection is stable.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, toast, updateCacheStats]);

  // Listen for online/offline events after syncNow is initialized so the
  // reconnect handler always calls the current callback and state.
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Back Online',
        description: 'Syncing your offline data...',
      });
      void syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'You\'re Offline',
        description: 'Your progress will be saved and synced when you\'re back online.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow, toast]);

  // Download content for offline use
  const downloadForOffline = useCallback(async (userId: string) => {
    if (!isOnline) {
      toast({
        title: 'No Connection',
        description: 'Connect to the internet to download content.',
        variant: 'destructive',
      });
      return;
    }

    setIsDownloading(true);
    try {
      // Download user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profile) {
        await cacheUserData('profile', profile);
      }

      // Download lessons (include all lessons, not just approved)
      const { data: lessons } = await supabase
        .from('lessons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (lessons && lessons.length > 0) {
        const offlineLessons = lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          subject: lesson.subject,
          class_level: lesson.class_level,
          content: lesson.content,
          examples: lesson.examples,
          exercises: lesson.exercises,
          objectives: lesson.objectives,
          cached_at: Date.now(),
        }));
        await cacheLessons(offlineLessons);
      }

      // Download user's quiz history
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (quizzes && quizzes.length > 0) {
        for (const quiz of quizzes) {
          await cacheQuiz({
            id: quiz.id,
            subject: 'cached',
            topic: 'From history',
            difficulty: quiz.difficulty || 'medium',
            questions: quiz.questions as any[],
            cached_at: Date.now(),
          });
        }
      }

      // Download achievements
      const { data: achievements } = await supabase
        .from('achievements')
        .select('*')
        .eq('student_id', userId);

      if (achievements) {
        await cacheUserData('achievements', achievements);
      }

      // Download learning streaks
      const { data: streaks } = await supabase
        .from('learning_streaks')
        .select('*')
        .eq('student_id', userId)
        .single();

      if (streaks) {
        await cacheUserData('learning_streaks', streaks);
      }

      await updateCacheStats();

      const downloadedLessons = lessons?.length || 0;
      const downloadedQuizzes = quizzes?.length || 0;

      if (downloadedLessons === 0 && downloadedQuizzes === 0) {
        toast({
          title: 'No Content Available',
          description: 'There are no lessons or quizzes to download yet. Generate some lessons first!',
        });
      } else {
        toast({
          title: 'Download Complete',
          description: `${downloadedLessons} lesson(s) and ${downloadedQuizzes} quiz(zes) saved for offline use.`,
        });
      }
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download Failed',
        description: 'Some content could not be downloaded.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  }, [isOnline, toast, updateCacheStats]);

  return {
    isOnline,
    isInitialized,
    pendingSyncCount,
    cacheStats,
    syncNow,
    downloadForOffline,
    isSyncing,
    isDownloading,
  };
};

// Hook for offline data access
export const useOfflineData = <T,>(
  key: string,
  fetchOnline: () => Promise<T | null>,
  deps: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (isOnline) {
          const onlineData = await fetchOnline();
          if (onlineData) {
            setData(onlineData);
            await cacheUserData(key, onlineData);
            setIsOfflineData(false);
          }
        } else {
          const cachedData = await getCachedUserData<T>(key);
          if (cachedData) {
            setData(cachedData);
            setIsOfflineData(true);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // Try cached data as fallback
        const cachedData = await getCachedUserData<T>(key);
        if (cachedData) {
          setData(cachedData);
          setIsOfflineData(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOnline, ...deps]);

  return { data, isLoading, isOfflineData };
};
