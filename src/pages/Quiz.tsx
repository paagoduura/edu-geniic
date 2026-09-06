import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Loader2, Volume2 } from 'lucide-react';
import VoiceButton from '@/components/VoiceButton';

interface Question {
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

const Quiz = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  const subject = searchParams.get('subject');
  const classLevel = searchParams.get('classLevel');
  const topic = searchParams.get('topic');
  const difficulty = searchParams.get('difficulty') || 'medium';

  const generateQuiz = useCallback(async () => {
    if (!subject || !classLevel || !topic) {
      toast({
        title: 'Missing Information',
        description: 'Please provide subject, class level, and topic.',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { subject, classLevel, topic, difficulty, userId: userData.user?.id },
      });

      if (error) throw error;

      if (!Array.isArray(data?.questions) || data.questions.length === 0 || !data.quiz?.id) {
        throw new Error('The generated quiz response was incomplete. Please try again.');
      }

      setQuestions(data.questions);
      setQuizId(data.quiz.id);
      setCurrentQuestion(0);
      setAnswers({});
      setResults(null);
      
      toast({
        title: 'Quiz Generated!',
        description: `${data.questions.length} questions ready for you.`,
      });
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate quiz',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [classLevel, difficulty, navigate, subject, toast, topic]);

  useEffect(() => {
    void generateQuiz();
  }, [generateQuiz]);

  const handleAnswer = (value: string) => {
    setAnswers((previousAnswers) => ({ ...previousAnswers, [currentQuestion]: value }));
  };

  const handleSubmit = async () => {
    if (!quizId) return;

    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      toast({
        title: 'Incomplete Quiz',
        description: `You have ${unanswered} unanswered questions.`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      const { data, error } = await supabase.functions.invoke('evaluate-quiz', {
        body: {
          quizId,
          answers: Object.values(answers),
          userId: userData.user?.id,
          timeSpent,
        },
      });

      if (error) throw error;

      setResults(data);
      toast({
        title: 'Quiz Submitted!',
        description: `You scored ${data.percentageScore}%`,
      });
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit quiz',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Generating Your Quiz</h2>
          <p className="text-muted-foreground">Creating personalized questions...</p>
        </Card>
      </div>
    );
  }

  if (results) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 mb-6 text-center">
            <div className="mb-6">
              {results.percentageScore >= 80 ? (
                <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
              ) : results.percentageScore >= 50 ? (
                <CheckCircle className="w-24 h-24 text-yellow-500 mx-auto mb-4" />
              ) : (
                <XCircle className="w-24 h-24 text-red-500 mx-auto mb-4" />
              )}
              <h1 className="text-4xl font-bold mb-2">Quiz Complete!</h1>
              <p className="text-6xl font-bold text-primary mb-4">{results.percentageScore}%</p>
              <p className="text-xl text-muted-foreground mb-2">
                {results.totalScore} out of {results.maxScore} points
              </p>
              <Badge variant={results.percentageScore >= 80 ? 'default' : results.percentageScore >= 50 ? 'secondary' : 'destructive'} className="text-lg px-4 py-2">
                {results.feedback}
              </Badge>
            </div>

            <div className="bg-secondary/30 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-2">Recommendation</h3>
              <p className="text-muted-foreground">{results.recommendation}</p>
            </div>
          </Card>

          <h2 className="text-2xl font-bold mb-4">Question Review</h2>
          <div className="space-y-4">
            {results.results.map((result: any, index: number) => (
              <Card key={index} className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  {result.isCorrect ? (
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-lg mb-2">Question {index + 1}</p>
                    <p className="mb-3">{result.question}</p>
                    
                    <div className="bg-secondary/30 rounded p-3 mb-2">
                      <p className="text-sm font-medium mb-1">Your Answer:</p>
                      <p className={result.isCorrect ? 'text-green-600' : 'text-red-600'}>
                        {result.userAnswer || 'No answer provided'}
                      </p>
                    </div>

                    {!result.isCorrect && (
                      <div className="bg-green-50 dark:bg-green-950 rounded p-3 mb-2">
                        <p className="text-sm font-medium mb-1">Correct Answer:</p>
                        <p className="text-green-600">{result.correctAnswer}</p>
                      </div>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-950 rounded p-3">
                      <p className="text-sm font-medium mb-1">Explanation:</p>
                      <p className="text-sm">{result.explanation}</p>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline">{result.points} points</Badge>
                      <VoiceButton text={`${result.question}. ${result.explanation}`} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-4 mt-6">
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button onClick={() => navigate('/performance')} className="flex-1">
              View Performance
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const answered = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold">Quiz: {topic}</h1>
            <Badge variant="secondary">
              {answered}/{questions.length} Answered
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Badge>Question {currentQuestion + 1} of {questions.length}</Badge>
                <Badge variant="outline">{question?.points || 10} points</Badge>
                <VoiceButton text={question?.question || ''} />
              </div>
              <h2 className="text-2xl font-semibold mb-6">{question?.question}</h2>
            </div>
          </div>

          {question?.type === 'multiple-choice' && (
            <RadioGroup value={answers[currentQuestion]} onValueChange={handleAnswer}>
              <div className="space-y-3">
                {question.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {question?.type === 'true-false' && (
            <RadioGroup value={answers[currentQuestion]} onValueChange={handleAnswer}>
              <div className="space-y-3">
                {['True', 'False'].map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value={option} id={`option-${option}`} />
                    <Label htmlFor={`option-${option}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {question?.type === 'short-answer' && (
            <Input
              value={answers[currentQuestion] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="text-lg p-4"
            />
          )}
        </Card>

        <div className="flex gap-4">
          <Button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            variant="outline"
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              className="flex-1"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || answered < questions.length}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Quiz'
              )}
            </Button>
          )}
        </div>

        <Button
          onClick={() => navigate('/dashboard')}
          variant="ghost"
          className="w-full mt-4"
        >
          Cancel Quiz
        </Button>
      </div>
    </div>
  );
};

export default Quiz;
