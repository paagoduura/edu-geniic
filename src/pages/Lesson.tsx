import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Lightbulb, Download, Loader2 } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import VoiceTeacher from "@/components/VoiceTeacher";
import { SectionReader } from "@/components/SectionReader";
import { VoiceQA } from "@/components/VoiceQA";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Lesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [lesson, setLesson] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (lessonId) {
      fetchLesson(lessonId);
    }
  }, [lessonId]);

  const fetchLesson = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setLesson(data);
    } catch (error: any) {
      console.error('Error fetching lesson:', error);
      toast({
        title: "Error",
        description: "Failed to load lesson.",
        variant: "destructive"
      });
      navigate('/lesson-history');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStep = (step: number) => {
    setCompletedSteps(prev => 
      prev.includes(step) 
        ? prev.filter(s => s !== step)
        : [...prev, step]
    );
  };

  const downloadLesson = async () => {
    if (!lesson) return;
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      const content = document.createElement('div');
      content.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
          <h1 style="color: #1a1a1a; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">${lesson.title}</h1>
          <p style="color: #666; margin-bottom: 20px;">
            <strong>Subject:</strong> ${lesson.subject.replace('_', ' ')} | 
            <strong>Class:</strong> ${lesson.class_level.replace('_', ' ')} |
            <strong>Date:</strong> ${format(new Date(lesson.created_at), 'PPP')}
          </p>
          
          ${lesson.objectives?.length ? `
            <h2 style="color: #4f46e5; margin-top: 20px;">Learning Objectives</h2>
            <ul style="line-height: 1.8;">
              ${lesson.objectives.map((obj: string) => `<li>${obj}</li>`).join('')}
            </ul>
          ` : ''}
          
          ${lesson.content?.introduction ? `
            <h2 style="color: #4f46e5; margin-top: 20px;">Introduction</h2>
            <p style="line-height: 1.6;">${lesson.content.introduction}</p>
          ` : ''}
          
          ${lesson.content?.sections?.length ? `
            <h2 style="color: #4f46e5; margin-top: 20px;">Lesson Content</h2>
            ${lesson.content.sections.map((section: any) => `
              <h3 style="color: #1a1a1a; margin-top: 15px;">${section.heading}</h3>
              <p style="line-height: 1.6;">${section.explanation}</p>
              ${section.keyPoints?.length ? `
                <ul style="line-height: 1.8;">
                  ${section.keyPoints.map((point: string) => `<li>${point}</li>`).join('')}
                </ul>
              ` : ''}
            `).join('')}
          ` : ''}
          
          ${lesson.content?.summary ? `
            <h2 style="color: #4f46e5; margin-top: 20px;">Summary</h2>
            <p style="line-height: 1.6; background: #eff6ff; padding: 15px; border-radius: 8px;">${lesson.content.summary}</p>
          ` : ''}
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `${lesson.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(content).save();
      
      toast({
        title: "Downloaded!",
        description: "Lesson has been saved as PDF.",
      });
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  // Default demo lesson content
  const defaultLessonContent = `Understanding Fractions. A fraction is a way of showing a part of a whole. Imagine you have one orange. If you cut it into 4 equal parts and take 1 part, you have taken 1 quarter of the orange. Every fraction has two parts: the numerator, which is the top number that shows how many parts you have, and the denominator, which is the bottom number that shows the total number of equal parts. In Nigeria, we use fractions every day. For example, when mama shares akara among her children equally, or when you divide money among friends.`;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If we have a lesson from DB, render it
  if (lesson) {
    const fullContent = `${lesson.title}. ${lesson.content?.introduction || ''} ${
      lesson.content?.sections?.map((s: any) => `${s.heading}. ${s.explanation}`).join(' ') || ''
    } ${lesson.content?.summary || ''}`;

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/lesson-history')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Lessons
            </Button>
            <Button variant="outline" size="sm" onClick={downloadLesson}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
              {lesson.class_level.replace('_', ' ').toUpperCase()} · {lesson.subject.replace('_', ' ')}
            </div>
            <h1 className="text-4xl font-bold mb-4">{lesson.title}</h1>
            
            <div className="flex flex-wrap gap-4 mb-6">
              <VoiceTeacher 
                text={fullContent}
                title="🎧 Voice Teacher"
                showLanguageSelector={true}
                defaultLanguage="english"
              />
            </div>

            <VoiceQA 
              context={fullContent}
              className="mb-6"
            />
          </div>

          {/* Learning Objectives */}
          {lesson.objectives && lesson.objectives.length > 0 && (
            <Card className="mb-6 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-6 h-6 text-accent" />
                  Learning Objectives
                  <SectionReader text={lesson.objectives.join('. ')} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {lesson.objectives.map((obj: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Introduction */}
          {lesson.content?.introduction && (
            <Card className="mb-6 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Introduction
                  <SectionReader text={lesson.content.introduction} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{lesson.content.introduction}</p>
              </CardContent>
            </Card>
          )}

          {/* Content Sections */}
          {lesson.content?.sections && (
            <div className="space-y-6">
              {lesson.content.sections.map((section: any, idx: number) => (
                <Card 
                  key={idx}
                  className={`border-2 transition-all duration-300 cursor-pointer hover:shadow-lg ${
                    completedSteps.includes(idx) ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => toggleStep(idx)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {section.heading}
                        <SectionReader text={`${section.heading}. ${section.explanation}. ${section.keyPoints?.join('. ') || ''}`} />
                      </span>
                      {completedSteps.includes(idx) && (
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-lg leading-relaxed">{section.explanation}</p>
                    {section.keyPoints && section.keyPoints.length > 0 && (
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="font-semibold mb-2">Key Points:</p>
                        <ul className="space-y-1">
                          {section.keyPoints.map((point: string, pidx: number) => (
                            <li key={pidx} className="flex items-start gap-2">
                              <span className="text-primary">→</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Summary */}
          {lesson.content?.summary && (
            <Card className="mt-6 border-2 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Summary
                  <SectionReader text={lesson.content.summary} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{lesson.content.summary}</p>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 flex gap-4">
            <Button variant="outline" size="lg" className="flex-1" onClick={() => navigate('/lesson-history')}>
              Back to Lessons
            </Button>
            <Button size="lg" className="flex-1" onClick={() => navigate('/quiz-setup')}>
              Take Quiz →
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Default demo lesson (when no lessonId provided)
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            Primary 4 · Mathematics
          </div>
          <h1 className="text-4xl font-bold mb-4">Understanding Fractions</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Learn how to work with fractions through simple, real-world examples
          </p>
          
          <VoiceTeacher 
            text={defaultLessonContent}
            title="🎧 Voice Teacher - Listen in Your Language"
            showLanguageSelector={true}
            defaultLanguage="english"
          />
        </div>

        <Card className="mb-6 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-accent" />
              Lesson Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Understand what fractions represent in everyday life</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Learn to identify numerators and denominators</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Practice with Nigerian examples (sharing food, money)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card 
            className={`border-2 transition-all duration-300 cursor-pointer hover:shadow-lg ${
              completedSteps.includes(1) ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => toggleStep(1)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Step 1: What is a Fraction?</span>
                {completedSteps.includes(1) && (
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg leading-relaxed">
                A fraction is a way of showing a part of a whole. Imagine you have one orange 🍊. 
                If you cut it into 4 equal parts and take 1 part, you have taken <strong className="text-primary">1/4</strong> (one-quarter) 
                of the orange.
              </p>
              <div className="bg-muted p-6 rounded-xl">
                <p className="text-center text-2xl mb-2">🍊 ➜ 🍊🍊🍊🍊</p>
                <p className="text-center text-muted-foreground">One whole orange divided into 4 parts</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`border-2 transition-all duration-300 cursor-pointer hover:shadow-lg ${
              completedSteps.includes(2) ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => toggleStep(2)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Step 2: Parts of a Fraction</span>
                {completedSteps.includes(2) && (
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg leading-relaxed">
                Every fraction has two parts:
              </p>
              <div className="space-y-4">
                <div className="bg-secondary/10 p-6 rounded-xl border-2 border-secondary/20">
                  <p className="text-4xl font-bold text-center text-secondary mb-2">1</p>
                  <p className="text-center font-semibold">Numerator (Top Number)</p>
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    Shows how many parts you have
                  </p>
                </div>
                <div className="text-center text-2xl font-bold">÷</div>
                <div className="bg-primary/10 p-6 rounded-xl border-2 border-primary/20">
                  <p className="text-4xl font-bold text-center text-primary mb-2">4</p>
                  <p className="text-center font-semibold">Denominator (Bottom Number)</p>
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    Shows total number of equal parts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`border-2 transition-all duration-300 cursor-pointer hover:shadow-lg ${
              completedSteps.includes(3) ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => toggleStep(3)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Step 3: Nigerian Example - Sharing Akara</span>
                {completedSteps.includes(3) && (
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg leading-relaxed">
                Mama bought 8 pieces of akara. She gave 3 pieces to Tunde. What fraction of the akara did Tunde get?
              </p>
              <div className="bg-accent/10 p-6 rounded-xl border-2 border-accent/20">
                <p className="text-center text-3xl font-bold text-accent mb-4">3/8</p>
                <p className="text-center">
                  Tunde got <strong>3 out of 8</strong> pieces of akara
                </p>
              </div>
              <div className="text-center">
                <p className="text-4xl mb-2">🟤🟤🟤⚪⚪⚪⚪⚪</p>
                <p className="text-sm text-muted-foreground">
                  Brown circles = Tunde's share | White circles = Remaining
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex gap-4">
          <Link to="/dashboard" className="flex-1">
            <Button variant="outline" size="lg" className="w-full">
              Save Progress
            </Button>
          </Link>
          <Button size="lg" className="flex-1" onClick={() => navigate('/quiz-setup')}>
            Take Quiz →
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Lesson;
