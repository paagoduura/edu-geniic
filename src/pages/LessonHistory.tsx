import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Search, Download, Eye, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const subjects = [
  { value: 'all', label: 'All Subjects' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'english', label: 'English' },
  { value: 'science', label: 'Science' },
  { value: 'social_studies', label: 'Social Studies' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'biology', label: 'Biology' },
];

const classLevels = [
  { value: 'all', label: 'All Classes' },
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

export default function LessonHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  useEffect(() => {
    fetchLessons();
  }, [user]);

  const fetchLessons = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLessons(data || []);
    } catch (error: any) {
      console.error('Error fetching lessons:', error);
      toast({
        title: "Error",
        description: "Failed to load lessons.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadLesson = async (lesson: any) => {
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
          
          ${lesson.examples?.length ? `
            <h2 style="color: #4f46e5; margin-top: 20px;">Examples</h2>
            ${lesson.examples.map((example: any) => `
              <div style="background: #f3f4f6; padding: 15px; margin: 10px 0; border-radius: 8px;">
                <strong>${example.title}</strong>
                <p>${example.description}</p>
              </div>
            `).join('')}
          ` : ''}
          
          ${lesson.exercises?.length ? `
            <h2 style="color: #4f46e5; margin-top: 20px;">Practice Exercises</h2>
            ${lesson.exercises.map((exercise: any, idx: number) => `
              <div style="margin: 15px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <p><strong>Question ${idx + 1}:</strong> ${exercise.question}</p>
                <p style="color: #059669; margin-top: 5px;"><strong>Answer:</strong> ${exercise.answer}</p>
              </div>
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
      toast({
        title: "Download Failed",
        description: "Could not generate PDF.",
        variant: "destructive"
      });
    }
  };

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectFilter === 'all' || lesson.subject === subjectFilter;
    const matchesClass = classFilter === 'all' || lesson.class_level === classFilter;
    return matchesSearch && matchesSubject && matchesClass;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button onClick={() => navigate('/generate-lesson')}>
            Generate New Lesson
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Lesson Library</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Your Lessons</h1>
          <p className="text-muted-foreground text-lg">
            View, download, and manage your generated lessons
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search lessons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  {classLevels.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lessons Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredLessons.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No lessons found</h3>
              <p className="text-muted-foreground mb-4">
                {lessons.length === 0 
                  ? "You haven't generated any lessons yet." 
                  : "No lessons match your search criteria."}
              </p>
              <Button onClick={() => navigate('/generate-lesson')}>
                Generate Your First Lesson
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLessons.map((lesson) => (
              <Card key={lesson.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{lesson.title}</CardTitle>
                    {lesson.is_approved && (
                      <Badge variant="secondary" className="shrink-0">Approved</Badge>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(lesson.created_at), 'PP')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">
                      {lesson.subject.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline">
                      {lesson.class_level.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/lesson/${lesson.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadLesson(lesson)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
