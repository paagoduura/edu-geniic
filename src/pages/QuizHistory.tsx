import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Trophy, RefreshCw, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Quiz {
  id: string;
  created_at: string;
  completed_at: string | null;
  score: number | null;
  difficulty: string | null;
  time_spent: number | null;
  questions: any;
}

const QuizHistory = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizHistory();
  }, []);

  const fetchQuizHistory = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('student_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error fetching quiz history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'bg-muted text-muted-foreground';
    if (score >= 80) return 'bg-green-500/20 text-green-600 dark:text-green-400';
    if (score >= 50) return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
    return 'bg-red-500/20 text-red-600 dark:text-red-400';
  };

  const getQuizInfo = (quiz: Quiz) => {
    const questions = quiz.questions as any[];
    if (!questions || questions.length === 0) return { subject: 'Unknown', topic: 'Unknown' };
    
    // Try to extract subject and topic from questions metadata or first question
    const firstQuestion = questions[0];
    return {
      subject: firstQuestion?.subject || 'General',
      topic: firstQuestion?.topic || 'Mixed Topics',
      questionCount: questions.length
    };
  };

  const handleRetakeQuiz = (quiz: Quiz) => {
    const info = getQuizInfo(quiz);
    const params = new URLSearchParams({
      subject: info.subject.toLowerCase().replace(' ', '_'),
      topic: info.topic,
      difficulty: quiz.difficulty || 'medium',
      classLevel: 'jss_1' // Default, could be stored in quiz
    });
    navigate(`/quiz?${params.toString()}`);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    if (minutes < 1) return 'Less than 1 min';
    return `${Math.round(minutes)} min`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-2 mb-6">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl">Quiz History</CardTitle>
            <CardDescription className="text-lg">
              Review your past quizzes and track your progress
            </CardDescription>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No quizzes yet</h3>
              <p className="text-muted-foreground mb-6">
                Start your learning journey by taking your first quiz!
              </p>
              <Button onClick={() => navigate('/quiz-setup')}>
                Take Your First Quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {quizzes.map((quiz) => {
              const info = getQuizInfo(quiz);
              return (
                <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg capitalize">
                            {info.subject.replace('_', ' ')}
                          </h3>
                          <Badge variant="outline" className="capitalize">
                            {quiz.difficulty || 'medium'}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-2 capitalize">
                          {info.topic}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(quiz.created_at), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDuration(quiz.time_spent)}
                          </span>
                          <span>{info.questionCount} questions</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <Badge className={`text-lg px-4 py-2 ${getScoreColor(quiz.score)}`}>
                            {quiz.score !== null ? `${quiz.score}%` : 'Incomplete'}
                          </Badge>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRetakeQuiz(quiz)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retake
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizHistory;
