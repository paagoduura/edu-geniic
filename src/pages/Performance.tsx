import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  AlertCircle,
  BookOpen,
  Loader2,
  BarChart3,
  Calendar,
} from 'lucide-react';

interface Analytics {
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  recentTrend: 'improving' | 'declining' | 'stable' | 'no-data';
  subjectBreakdown: Record<string, { count: number; avgScore: number }>;
  improvementRate: number;
  masteredTopics: string[];
  strugglingTopics: string[];
}

interface Recommendation {
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  topics?: string[];
}

const Performance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('student-progress', {
        body: { userId: userData.user?.id },
      });

      if (error) throw error;

      setAnalytics(data.analytics);
      setRecommendations(data.recommendations);
      setPerformanceHistory(data.performance || []);
      setQuizHistory(data.quizzes || []);
    } catch (error: any) {
      console.error('Error fetching progress:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load performance data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Loading Performance Data</h2>
          <p className="text-muted-foreground">Analyzing your learning progress...</p>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="p-8 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">No Performance Data Yet</h2>
            <p className="text-muted-foreground mb-6">
              Complete quizzes and lessons to see your progress here.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="w-5 h-5 text-red-500" />;
    return <Target className="w-5 h-5 text-blue-500" />;
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'destructive';
    if (priority === 'medium') return 'default';
    return 'secondary';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={() => navigate('/dashboard')} variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Performance Dashboard</h1>
            <p className="text-muted-foreground">Track your learning progress and insights</p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Average Score</p>
              {getTrendIcon(analytics.recentTrend)}
            </div>
            <p className="text-3xl font-bold text-primary">{analytics.averageScore}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.totalAttempts} total attempts
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Highest Score</p>
              <Award className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold">{analytics.highestScore}%</p>
            <Progress value={analytics.highestScore} className="mt-2" />
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Improvement Rate</p>
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">
              {analytics.improvementRate > 0 ? '+' : ''}{analytics.improvementRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">vs previous attempts</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Status</p>
              <Target className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-xl font-bold capitalize">{analytics.recentTrend}</p>
            <p className="text-xs text-muted-foreground mt-1">recent trend</p>
          </Card>
        </div>

        {/* Adaptive Learning Recommendations */}
        {recommendations.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Adaptive Learning Recommendations
            </h2>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <Badge variant={getPriorityColor(rec.priority) as any}>
                    {rec.priority}
                  </Badge>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{rec.title}</h3>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                    {rec.topics && rec.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rec.topics.map((topic, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Subject Breakdown & Topics */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Subject Performance</h2>
            <div className="space-y-4">
              {Object.entries(analytics.subjectBreakdown).map(([subject, data]) => (
                <div key={subject}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium capitalize">{subject}</span>
                    <span className="text-sm text-muted-foreground">
                      {data.avgScore}% ({data.count} attempts)
                    </span>
                  </div>
                  <Progress value={data.avgScore} />
                </div>
              ))}
              {Object.keys(analytics.subjectBreakdown).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No subject data available yet
                </p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Topic Mastery</h2>
            <Tabs defaultValue="mastered">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mastered">Mastered</TabsTrigger>
                <TabsTrigger value="struggling">Need Practice</TabsTrigger>
              </TabsList>
              <TabsContent value="mastered" className="space-y-2 mt-4">
                {analytics.masteredTopics.length > 0 ? (
                  analytics.masteredTopics.map((topic, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                      <Award className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{topic}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No mastered topics yet. Keep practicing!
                  </p>
                )}
              </TabsContent>
              <TabsContent value="struggling" className="space-y-2 mt-4">
                {analytics.strugglingTopics.length > 0 ? (
                  analytics.strugglingTopics.map((topic, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm">{topic}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Great! No struggling topics identified.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Activity
          </h2>
          <Tabs defaultValue="quizzes">
            <TabsList>
              <TabsTrigger value="quizzes">Quiz History</TabsTrigger>
              <TabsTrigger value="performance">Performance Records</TabsTrigger>
            </TabsList>
            <TabsContent value="quizzes" className="mt-4">
              <div className="space-y-3">
                {quizHistory.slice(0, 10).map((quiz) => (
                  <div key={quiz.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">Quiz #{quiz.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(quiz.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{quiz.score}%</p>
                      <Badge variant={quiz.score >= 80 ? 'default' : quiz.score >= 50 ? 'secondary' : 'destructive'}>
                        {quiz.difficulty}
                      </Badge>
                    </div>
                  </div>
                ))}
                {quizHistory.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No quiz history yet
                  </p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="performance" className="mt-4">
              <div className="space-y-3">
                {performanceHistory.slice(0, 10).map((perf) => (
                  <div key={perf.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium capitalize">{perf.subject}</p>
                      <p className="text-sm text-muted-foreground">{perf.topic}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(perf.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{perf.score}%</p>
                      {perf.feedback && (
                        <p className="text-xs text-muted-foreground max-w-xs">
                          {perf.feedback}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {performanceHistory.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No performance records yet
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="flex gap-4 mt-6">
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button onClick={fetchProgress} variant="secondary" className="flex-1">
            Refresh Data
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Performance;
