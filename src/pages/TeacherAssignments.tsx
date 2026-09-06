import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, FileText, Users, CheckCircle, Clock, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const subjects = [
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'english', label: 'English' },
  { value: 'science', label: 'Science' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'biology', label: 'Biology' },
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

export default function TeacherAssignments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [targetClassId, setTargetClassId] = useState('');
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchAssignments();
      fetchTeacherClasses();
    }
  }, [user]);

  const fetchTeacherClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_classes')
        .select('id, name, class_level, section, subject')
        .eq('teacher_id', user?.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setTeacherClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*, teacher_classes:target_class_id (id, name, section)')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load assignments.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubmissions = async (assignmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          profiles:student_id (full_name, student_id)
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error: any) {
      console.error('Error fetching submissions:', error);
    }
  };

  const createAssignment = async () => {
    if (!title || !subject || !classLevel) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('assignments')
        .insert({
          title,
          description,
          instructions,
          subject: subject as any,
          class_level: classLevel as any,
          due_date: dueDate || null,
          max_score: parseInt(maxScore) || 100,
          created_by: user?.id,
          is_published: true,
          target_class_id: targetClassId && targetClassId !== 'all' ? targetClassId : null
        });

      if (error) throw error;

      toast({
        title: "Assignment Created!",
        description: "Your assignment has been published.",
      });

      // Reset form
      setTitle('');
      setDescription('');
      setInstructions('');
      setSubject('');
      setClassLevel('');
      setDueDate('');
      setMaxScore('100');
      setTargetClassId('');
      setShowCreateDialog(false);
      fetchAssignments();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const gradeSubmission = async (submissionId: string, score: number, feedback: string) => {
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          score,
          feedback,
          graded_by: user?.id,
          graded_at: new Date().toISOString(),
          status: 'graded'
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Graded!",
        description: "Submission has been graded successfully.",
      });

      if (selectedAssignment) {
        fetchSubmissions(selectedAssignment.id);
      }
    } catch (error: any) {
      console.error('Error grading submission:', error);
      toast({
        title: "Error",
        description: "Failed to grade submission.",
        variant: "destructive"
      });
    }
  };

  const downloadAssignment = async (assignment: any) => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      const content = document.createElement('div');
      content.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
          <h1 style="color: #1a1a1a; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">${assignment.title}</h1>
          <p style="color: #666; margin-bottom: 20px;">
            <strong>Subject:</strong> ${assignment.subject.replace('_', ' ')} | 
            <strong>Class:</strong> ${assignment.class_level.replace('_', ' ')} |
            <strong>Max Score:</strong> ${assignment.max_score} points
            ${assignment.due_date ? `| <strong>Due:</strong> ${format(new Date(assignment.due_date), 'PPP')}` : ''}
          </p>
          
          ${assignment.description ? `
            <h2 style="color: #4f46e5; margin-top: 20px;">Description</h2>
            <p style="line-height: 1.6;">${assignment.description}</p>
          ` : ''}
          
          ${assignment.instructions ? `
            <h2 style="color: #4f46e5; margin-top: 20px;">Instructions</h2>
            <p style="line-height: 1.6; white-space: pre-wrap;">${assignment.instructions}</p>
          ` : ''}
          
          <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <h3>Student Submission</h3>
            <p>Name: _______________________</p>
            <p>Student ID: _______________________</p>
            <p>Date: _______________________</p>
            <div style="margin-top: 20px; min-height: 300px; border: 1px solid #e5e7eb; padding: 15px;">
              <p style="color: #999;">Write your answer here...</p>
            </div>
          </div>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `${assignment.title.replace(/[^a-z0-9]/gi, '_')}_assignment.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(content).save();
      
      toast({
        title: "Downloaded!",
        description: "Assignment has been saved as PDF.",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/teacher')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
                <DialogDescription>
                  Create an assignment for your students
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Assignment title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Class Level *</Label>
                    <Select value={classLevel} onValueChange={setClassLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classLevels.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the assignment"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Detailed instructions for students"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="min-h-[150px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxScore">Max Score</Label>
                    <Input
                      id="maxScore"
                      type="number"
                      value={maxScore}
                      onChange={(e) => setMaxScore(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Target Class (Optional)</Label>
                  <Select value={targetClassId} onValueChange={setTargetClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All students (no specific class)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All students</SelectItem>
                      {teacherClasses.map((tc) => (
                        <SelectItem key={tc.id} value={tc.id}>
                          {tc.name}{tc.section ? ` - ${tc.section}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={createAssignment} 
                  disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Assignment
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Assignment Management</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Assignments</h1>
          <p className="text-muted-foreground text-lg">
            Create, manage, and grade student assignments
          </p>
        </div>

        <Tabs defaultValue="assignments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="assignments">My Assignments</TabsTrigger>
            <TabsTrigger value="submissions">Submissions to Grade</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : assignments.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No assignments yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first assignment for students.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Assignment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map((assignment) => (
                  <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2">{assignment.title}</CardTitle>
                        <Badge variant={assignment.is_published ? "default" : "secondary"}>
                          {assignment.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <CardDescription>
                        {assignment.due_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due: {format(new Date(assignment.due_date), 'PP')}
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="outline">
                          {assignment.subject.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {assignment.class_level.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {assignment.max_score} pts
                        </Badge>
                        {assignment.teacher_classes && (
                          <Badge variant="secondary">
                            <Users className="w-3 h-3 mr-1" />
                            {assignment.teacher_classes.name}{assignment.teacher_classes.section ? ` ${assignment.teacher_classes.section}` : ''}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            fetchSubmissions(assignment.id);
                          }}
                        >
                          <Users className="w-4 h-4 mr-1" />
                          Submissions
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadAssignment(assignment)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="submissions">
            {selectedAssignment ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedAssignment.title}</CardTitle>
                      <CardDescription>
                        {submissions.length} submission(s)
                      </CardDescription>
                    </div>
                    <Button variant="ghost" onClick={() => setSelectedAssignment(null)}>
                      View All Assignments
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {submissions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No submissions yet for this assignment.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {submissions.map((submission) => (
                        <SubmissionCard 
                          key={submission.id} 
                          submission={submission}
                          maxScore={selectedAssignment.max_score}
                          onGrade={gradeSubmission}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="py-12">
                <CardContent className="text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select an Assignment</h3>
                  <p className="text-muted-foreground">
                    Click "Submissions" on an assignment to view and grade student work.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function SubmissionCard({ 
  submission, 
  maxScore, 
  onGrade 
}: { 
  submission: any; 
  maxScore: number;
  onGrade: (id: string, score: number, feedback: string) => void;
}) {
  const [score, setScore] = useState(submission.score?.toString() || '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [isGrading, setIsGrading] = useState(false);

  const handleGrade = async () => {
    setIsGrading(true);
    await onGrade(submission.id, parseInt(score), feedback);
    setIsGrading(false);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-semibold">{submission.profiles?.full_name || 'Unknown Student'}</p>
            <p className="text-sm text-muted-foreground">
              ID: {submission.profiles?.student_id} | 
              Submitted: {format(new Date(submission.submitted_at), 'PPp')}
            </p>
          </div>
          <Badge variant={
            submission.status === 'graded' ? 'default' : 
            submission.status === 'submitted' ? 'secondary' : 'outline'
          }>
            {submission.status}
          </Badge>
        </div>

        {submission.content && (
          <div className="bg-muted/50 p-3 rounded-lg mb-4">
            <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Score (out of {maxScore})</Label>
            <Input
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              max={maxScore}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label>Feedback</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide feedback to the student"
            />
          </div>
        </div>

        <Button 
          onClick={handleGrade} 
          disabled={isGrading || !score}
          className="mt-4"
        >
          {isGrading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          {submission.status === 'graded' ? 'Update Grade' : 'Submit Grade'}
        </Button>
      </CardContent>
    </Card>
  );
}
