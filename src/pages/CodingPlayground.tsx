import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Code, Loader2, Trophy, BarChart3, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCodingProgress } from '@/hooks/useCodingProgress';
import { useCodingRewards } from '@/hooks/useCodingRewards';
import CodingTopicSelector from '@/components/coding/CodingTopicSelector';
import CodingLessonView from '@/components/coding/CodingLessonView';
import CodingIDE from '@/components/coding/CodingIDE';

interface Topic {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  icon: string;
}

const CodingPlayground = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { saveProgress, getTopicProgress, getLanguageStats, totalCompleted } = useCodingProgress();
  const { awardTopicCompletion } = useCodingRewards();
  const [showIDE, setShowIDE] = useState(false);

  const [language, setLanguage] = useState('javascript');
  const [level, setLevel] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [lesson, setLesson] = useState<any>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('class_level')
      .eq('user_id', user!.id)
      .single();

    if (data) {
      const cl = data.class_level || '';
      if (cl.startsWith('primary')) setLevel('primary');
      else if (cl.startsWith('jss')) setLevel('junior_secondary');
      else if (cl.startsWith('ss')) setLevel('senior_secondary');
      else setLevel('primary');
    }
  };

  const loadTopics = async () => {
    if (!level) return;
    setIsLoadingTopics(true);
    try {
      const { data, error } = await supabase.functions.invoke('coding-lesson', {
        body: { action: 'get_topics', language, level },
      });
      if (error) throw error;
      setTopics(data?.topics || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load topics. Try again.', variant: 'destructive' });
    } finally {
      setIsLoadingTopics(false);
    }
  };

  useEffect(() => {
    if (level && language) {
      setTopics([]);
      setSelectedTopic(null);
      setLesson(null);
      loadTopics();
    }
  }, [level, language]);

  const handleTopicSelect = async (topic: Topic) => {
    setSelectedTopic(topic);
    setIsLoadingLesson(true);
    try {
      const { data, error } = await supabase.functions.invoke('coding-lesson', {
        body: { action: 'generate_lesson', language, level, topic: topic.title },
      });
      if (error) throw error;
      setLesson(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to generate lesson. Try again.', variant: 'destructive' });
      setSelectedTopic(null);
    } finally {
      setIsLoadingLesson(false);
    }
  };

  const handleEvaluateCode = async (code: string, problemDesc: string) => {
    setIsEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke('coding-lesson', {
        body: { action: 'evaluate_code', language, code, lessonContent: problemDesc },
      });
      if (error) throw error;
      return data;
    } catch {
      toast({ title: 'Error', description: 'Failed to evaluate code.', variant: 'destructive' });
      return null;
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleGetHint = async (code: string, problemDesc: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('coding-lesson', {
        body: { action: 'get_hint', language, code, lessonContent: problemDesc },
      });
      if (error) throw error;
      return data?.hint || data?.raw || 'Try breaking the problem into smaller steps!';
    } catch {
      return 'Think about what the problem is asking step by step!';
    }
  };

  const handleProgressUpdate = async (solvedCount: number, totalCount: number) => {
    if (selectedTopic) {
      await saveProgress(language, selectedTopic.title, level, solvedCount, totalCount);
      if (solvedCount >= totalCount) {
        await awardTopicCompletion(language, selectedTopic.title);
      }
    }
  };

  const langStats = getLanguageStats(language);

  if (showIDE) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowIDE(false)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Lessons
            </Button>
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Coding IDE</h1>
            </div>
          </div>
        </nav>
        <CodingIDE />
      </div>
    );
  }

  if (isLoadingLesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-bold">Preparing your coding lesson...</h2>
          <p className="text-muted-foreground">Our AI tutor is creating a fun lesson just for you! 🚀</p>
        </div>
      </div>
    );
  }

  if (lesson && selectedTopic) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <CodingLessonView
            lesson={lesson}
            language={language}
            onEvaluateCode={handleEvaluateCode}
            onGetHint={handleGetHint}
            isEvaluating={isEvaluating}
            onBack={() => {
              setLesson(null);
              setSelectedTopic(null);
            }}
            onProgressUpdate={handleProgressUpdate}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Coding Playground</h1>
          </div>
          {totalCompleted > 0 && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => navigate('/coding/progress')}>
              <Trophy className="w-3 h-3" /> {totalCompleted} completed
            </Badge>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate('/coding/progress')}>
            <BarChart3 className="w-4 h-4" /> Stats
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowIDE(true)}>
            <Monitor className="w-4 h-4" /> IDE
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="text-5xl">👨‍💻</div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Learn to Code!</h2>
                <p className="text-muted-foreground">
                  Pick a language, choose a topic, and our AI tutor will teach you step by step with fun examples and practice problems!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Programming Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">🟨 JavaScript</SelectItem>
                <SelectItem value="python">🐍 Python</SelectItem>
                <SelectItem value="html">🌐 HTML</SelectItem>
                <SelectItem value="css">🎨 CSS</SelectItem>
                <SelectItem value="react">⚛️ React</SelectItem>
                <SelectItem value="typescript">🔷 TypeScript</SelectItem>
                <SelectItem value="expo">📱 Expo</SelectItem>
                <SelectItem value="react-native">📲 React Native</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Your Level</label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">🌱 Primary (Beginner)</SelectItem>
                <SelectItem value="junior_secondary">🌿 Junior Secondary (Intermediate)</SelectItem>
                <SelectItem value="senior_secondary">🌳 Senior Secondary (Advanced)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {level && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Choose a Topic</h3>
              {langStats.total > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Trophy className="w-3 h-3" />
                  {langStats.completed}/{langStats.total} topics completed
                </Badge>
              )}
            </div>
            <CodingTopicSelector
              topics={topics}
              isLoading={isLoadingTopics}
              onSelect={handleTopicSelect}
              getTopicProgress={(title) => getTopicProgress(language, title)}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default CodingPlayground;
