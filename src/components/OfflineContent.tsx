import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, ClipboardList, Download, Trash2, WifiOff, Clock } from 'lucide-react';
import { getCachedLessons, getCachedQuizzes, getCacheStats } from '@/lib/offlineStorage';
import { useOffline } from '@/hooks/useOffline';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface CachedLesson {
  id: string;
  title: string;
  subject: string;
  class_level: string;
  cached_at: number;
}

interface CachedQuiz {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  cached_at: number;
}

export const OfflineContent = () => {
  const [lessons, setLessons] = useState<CachedLesson[]>([]);
  const [quizzes, setQuizzes] = useState<CachedQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline, downloadForOffline, isDownloading, cacheStats } = useOffline();
  const { user } = useAuth();

  useEffect(() => {
    loadCachedContent();
  }, []);

  const loadCachedContent = async () => {
    setIsLoading(true);
    try {
      const cachedLessons = await getCachedLessons();
      const cachedQuizzes = await getCachedQuizzes();
      setLessons(cachedLessons);
      setQuizzes(cachedQuizzes);
    } catch (error) {
      console.error('Failed to load cached content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (user?.id) {
      await downloadForOffline(user.id);
      await loadCachedContent();
    }
  };

  const formatSubject = (subject: string) => {
    return subject
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatClassLevel = (level: string) => {
    return level
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3 mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <WifiOff className="w-5 h-5" />
              Offline Content
            </CardTitle>
            <CardDescription>
              Access these lessons and quizzes without internet
            </CardDescription>
          </div>
          {isOnline && (
            <Button onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                'Downloading...'
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Update Cache
                </>
              )}
            </Button>
          )}
        </div>
        {cacheStats && (
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <span>{cacheStats.lessonCount} lessons</span>
            <span>{cacheStats.quizCount} quizzes</span>
            <span>{cacheStats.totalSize} used</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {lessons.length === 0 && quizzes.length === 0 ? (
          <div className="text-center py-8">
            <WifiOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No offline content yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Download lessons and quizzes to access them offline
            </p>
            {isOnline && user && (
              <Button onClick={handleDownload} disabled={isDownloading}>
                <Download className="w-4 h-4 mr-2" />
                Download Content
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cached Lessons */}
            {lessons.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Lessons ({lessons.length})
                </h3>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="p-3 bg-secondary/30 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-sm">{lesson.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {formatSubject(lesson.subject)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {formatClassLevel(lesson.class_level)}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(lesson.cached_at, 'MMM d')}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Cached Quizzes */}
            {quizzes.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Quizzes ({quizzes.length})
                </h3>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {quizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="p-3 bg-secondary/30 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-sm">{quiz.topic}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {formatSubject(quiz.subject)}
                            </Badge>
                            <Badge 
                              variant={
                                quiz.difficulty === 'hard' ? 'destructive' : 
                                quiz.difficulty === 'medium' ? 'default' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {quiz.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(quiz.cached_at, 'MMM d')}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OfflineContent;
