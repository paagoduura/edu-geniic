import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ClipboardList, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Subject definitions with class level restrictions
const allSubjects = [
  { value: 'mathematics', label: 'Mathematics', levels: ['primary', 'jss', 'ss'] },
  { value: 'english', label: 'English', levels: ['primary', 'jss', 'ss'] },
  { value: 'science', label: 'Science', levels: ['primary'] },
  { value: 'social_studies', label: 'Social Studies', levels: ['primary', 'jss'] },
  { value: 'basic_science', label: 'Basic Science', levels: ['jss'] },
  { value: 'basic_technology', label: 'Basic Technology', levels: ['jss'] },
  { value: 'civic_education', label: 'Civic Education', levels: ['jss', 'ss'] },
  { value: 'home_economics', label: 'Home Economics', levels: ['jss'] },
  { value: 'agriculture', label: 'Agriculture', levels: ['jss', 'ss'] },
  { value: 'business_studies', label: 'Business Studies', levels: ['jss'] },
  { value: 'physics', label: 'Physics', levels: ['ss'] },
  { value: 'chemistry', label: 'Chemistry', levels: ['ss'] },
  { value: 'biology', label: 'Biology', levels: ['ss'] },
  { value: 'economics', label: 'Economics', levels: ['ss'] },
  { value: 'geography', label: 'Geography', levels: ['ss'] },
  { value: 'literature', label: 'Literature', levels: ['ss'] },
  { value: 'government', label: 'Government', levels: ['ss'] },
  { value: 'yoruba', label: 'Yoruba', levels: ['primary', 'jss', 'ss'] },
  { value: 'hausa', label: 'Hausa', levels: ['primary', 'jss', 'ss'] },
  { value: 'igbo', label: 'Igbo', levels: ['primary', 'jss', 'ss'] },
  { value: 'french', label: 'French', levels: ['jss', 'ss'] },
  { value: 'crk', label: 'Christian Religious Knowledge', levels: ['primary', 'jss', 'ss'] },
  { value: 'irk', label: 'Islamic Religious Knowledge', levels: ['primary', 'jss', 'ss'] },
];

const classLevels = [
  { value: 'primary_1', label: 'Primary 1', category: 'primary' },
  { value: 'primary_2', label: 'Primary 2', category: 'primary' },
  { value: 'primary_3', label: 'Primary 3', category: 'primary' },
  { value: 'primary_4', label: 'Primary 4', category: 'primary' },
  { value: 'primary_5', label: 'Primary 5', category: 'primary' },
  { value: 'primary_6', label: 'Primary 6', category: 'primary' },
  { value: 'jss_1', label: 'JSS 1', category: 'jss' },
  { value: 'jss_2', label: 'JSS 2', category: 'jss' },
  { value: 'jss_3', label: 'JSS 3', category: 'jss' },
  { value: 'ss_1', label: 'SS 1', category: 'ss' },
  { value: 'ss_2', label: 'SS 2', category: 'ss' },
  { value: 'ss_3', label: 'SS 3', category: 'ss' },
];

const difficulties = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const getClassCategory = (classLevel: string): string => {
  const level = classLevels.find(c => c.value === classLevel);
  return level?.category || '';
};

const getSubjectsForClass = (classLevel: string) => {
  const category = getClassCategory(classLevel);
  if (!category) return allSubjects;
  return allSubjects.filter(subject => subject.levels.includes(category));
};

const QuizSetup = () => {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [availableSubjects, setAvailableSubjects] = useState(allSubjects);

  useEffect(() => {
    // Try to fetch user's class level from profile
    const fetchUserProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('class_level')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        
        if (profile?.class_level) {
          setClassLevel(profile.class_level);
          setAvailableSubjects(getSubjectsForClass(profile.class_level));
        }
      }
    };
    fetchUserProfile();
  }, []);

  // Update available subjects when class level changes
  useEffect(() => {
    if (classLevel) {
      const subjects = getSubjectsForClass(classLevel);
      setAvailableSubjects(subjects);
      // Reset subject if current selection is not available for new class
      if (subject && !subjects.find(s => s.value === subject)) {
        setSubject('');
      }
    }
  }, [classLevel]);

  const handleStartQuiz = () => {
    if (!subject || !classLevel || !topic) return;
    
    const params = new URLSearchParams({
      subject,
      classLevel,
      topic,
      difficulty,
    });
    
    navigate(`/quiz?${params.toString()}`);
  };

  const isValid = subject && classLevel && topic.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl">Start a Quiz</CardTitle>
            <CardDescription className="text-lg">
              Choose your subject, class level, and topic to generate a personalized quiz
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="classLevel">Class Level *</Label>
              <Select value={classLevel} onValueChange={setClassLevel}>
                <SelectTrigger id="classLevel">
                  <SelectValue placeholder="Select your class level" />
                </SelectTrigger>
                <SelectContent>
                  {classLevels.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Fractions, Photosynthesis, World War II"
              />
              <p className="text-sm text-muted-foreground">
                Enter a specific topic you want to be tested on
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleStartQuiz} 
              disabled={!isValid}
              className="w-full h-12 text-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuizSetup;
