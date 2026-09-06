import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, BookOpen, Loader2, ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import VoiceTeacher from '@/components/VoiceTeacher';
import { SectionReader } from '@/components/SectionReader';
import { VoiceQA } from '@/components/VoiceQA';

const subjects = [
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'english', label: 'English' },
  { value: 'science', label: 'Science' },
  { value: 'social_studies', label: 'Social Studies' },
  { value: 'basic_science', label: 'Basic Science' },
  { value: 'basic_technology', label: 'Basic Technology' },
  { value: 'civic_education', label: 'Civic Education' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'biology', label: 'Biology' },
  { value: 'economics', label: 'Economics' },
  { value: 'geography', label: 'Geography' },
  { value: 'literature', label: 'Literature' },
  { value: 'government', label: 'Government' },
];

const classLevels = [
  { value: 'primary_1', label: 'Primary 1' },
  { value: 'primary_2', label: 'Primary 2' },
  { value: 'primary_3', label: 'Primary 3' },
  { value: 'primary_4', label: 'Primary 4' },
  { value: 'primary_5', label: 'Primary 5' },
  { value: 'primary_6', label: 'Primary 6' },
  { value: 'jss_1', label: 'JSS 1' },
  { value: 'jss_2', label: 'JSS 2' },
  { value: 'jss_3', label: 'JSS 3' },
  { value: 'ss_1', label: 'SS 1' },
  { value: 'ss_2', label: 'SS 2' },
  { value: 'ss_3', label: 'SS 3' },
];

export default function GenerateLesson() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState<any>(null);

  const handleGenerate = async () => {
    if (!subject || !classLevel || !topic.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields before generating a lesson.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedLesson(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-lesson', {
        body: {
          subject,
          classLevel,
          topic: topic.trim(),
          userId: user?.id
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedLesson(data.lesson);
      toast({
        title: "Lesson Generated!",
        description: "Your AI-powered lesson has been created successfully.",
      });
    } catch (error: any) {
      console.error('Error generating lesson:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate lesson. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">AI-Powered Lesson Generator</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Generate NERDC-Aligned Lessons</h1>
          <p className="text-muted-foreground text-lg">
            Create comprehensive, engaging lessons in seconds using AI
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Lesson Details
            </CardTitle>
            <CardDescription>
              Provide the subject, class level, and topic for your lesson
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="classLevel">Class Level</Label>
                <Select value={classLevel} onValueChange={setClassLevel}>
                  <SelectTrigger id="classLevel">
                    <SelectValue placeholder="Select class level" />
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Lesson Topic</Label>
              <Input
                id="topic"
                placeholder="e.g., Introduction to Fractions, Photosynthesis, Nigerian Independence"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isGenerating) {
                    handleGenerate();
                  }
                }}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Lesson...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Lesson
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {generatedLesson && (
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{generatedLesson.title}</CardTitle>
                  <CardDescription>
                    {subjects.find(s => s.value === subject)?.label} • {classLevels.find(c => c.value === classLevel)?.label}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <VoiceTeacher 
                    text={`${generatedLesson.title}. ${generatedLesson.introduction || ''} ${
                      generatedLesson.content?.sections?.map((s: any) => `${s.heading}. ${s.explanation}`).join(' ') || ''
                    } ${generatedLesson.summary || ''}`}
                  />
                  {generatedLesson.id && (
                    <Button variant="outline" size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      Saved
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Voice Q&A */}
              <VoiceQA 
                context={`Lesson: ${generatedLesson.title}. ${generatedLesson.introduction || ''} ${generatedLesson.summary || ''}`}
                className="mb-4"
              />

              {/* Learning Objectives */}
              {generatedLesson.objectives && generatedLesson.objectives.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-primary">Learning Objectives</h3>
                    <SectionReader text={generatedLesson.objectives.join('. ')} />
                  </div>
                  <ul className="space-y-2">
                    {generatedLesson.objectives.map((obj: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Introduction */}
              {generatedLesson.introduction && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-primary">Introduction</h3>
                    <SectionReader text={generatedLesson.introduction} />
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{generatedLesson.introduction}</p>
                </div>
              )}

              {/* Content Sections */}
              {generatedLesson.content?.sections && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Lesson Content</h3>
                  <div className="space-y-6">
                    {generatedLesson.content.sections.map((section: any, idx: number) => (
                      <div key={idx} className="bg-muted/30 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{section.heading}</h4>
                          <SectionReader text={`${section.heading}. ${section.explanation}. ${section.keyPoints?.join('. ') || ''}`} />
                        </div>
                        <p className="text-muted-foreground mb-3 leading-relaxed">{section.explanation}</p>
                        {section.keyPoints && section.keyPoints.length > 0 && (
                          <ul className="space-y-1">
                            {section.keyPoints.map((point: string, pidx: number) => (
                              <li key={pidx} className="flex items-start gap-2 text-sm">
                                <span className="text-accent mt-1">→</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Examples */}
              {generatedLesson.examples && generatedLesson.examples.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-primary">Examples</h3>
                    <SectionReader text={generatedLesson.examples.map((e: any) => `${e.title}. ${e.description}`).join('. ')} />
                  </div>
                  <div className="space-y-4">
                    {generatedLesson.examples.map((example: any, idx: number) => (
                      <div key={idx} className="border-l-4 border-accent pl-4 py-2">
                        <h4 className="font-semibold mb-1">{example.title}</h4>
                        <p className="text-muted-foreground text-sm">{example.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercises */}
              {generatedLesson.exercises && generatedLesson.exercises.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-primary">Practice Exercises</h3>
                    <SectionReader text={generatedLesson.exercises.map((e: any) => `Question: ${e.question}. Answer: ${e.answer}`).join('. ')} />
                  </div>
                  <div className="space-y-4">
                    {generatedLesson.exercises.map((exercise: any, idx: number) => (
                      <div key={idx} className="bg-secondary/5 p-4 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">Question {idx + 1}</h4>
                            <SectionReader text={`${exercise.question}. The answer is: ${exercise.answer}`} />
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            exercise.difficulty === 'easy' ? 'bg-success/20 text-success' :
                            exercise.difficulty === 'medium' ? 'bg-warning/20 text-warning' :
                            'bg-destructive/20 text-destructive'
                          }`}>
                            {exercise.difficulty}
                          </span>
                        </div>
                        <p className="text-muted-foreground mb-2">{exercise.question}</p>
                        <details className="text-sm">
                          <summary className="cursor-pointer text-primary hover:underline">Show answer</summary>
                          <p className="mt-2 text-muted-foreground">{exercise.answer}</p>
                        </details>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {generatedLesson.summary && (
                <div className="bg-primary/5 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-primary">Summary</h3>
                    <SectionReader text={generatedLesson.summary} />
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{generatedLesson.summary}</p>
                </div>
              )}

              {/* Raw content fallback */}
              {generatedLesson.content?.raw && (
                <div className="whitespace-pre-wrap text-muted-foreground">
                  {generatedLesson.content.raw}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
