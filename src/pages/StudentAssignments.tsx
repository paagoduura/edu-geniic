import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, FileText, Clock, CheckCircle, Send, Download, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, isPast } from 'date-fns';

export default function StudentAssignments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch available assignments
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('*')
        .eq('is_published', true)
        .order('due_date', { ascending: true });

      if (assignmentError) throw assignmentError;
      setAssignments(assignmentData || []);

      // Fetch user's submissions
      const { data: submissionData, error: submissionError } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          assignments (title, subject, class_level, max_score)
        `)
        .eq('student_id', user?.id)
        .order('submitted_at', { ascending: false });

      if (submissionError) throw submissionError;
      setSubmissions(submissionData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load assignments.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitAssignment = async () => {
    if (!selectedAssignment || !submissionContent.trim()) {
      toast({
        title: "Missing Content",
        description: "Please write your answer before submitting.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if already submitted
      const existingSubmission = submissions.find(s => s.assignment_id === selectedAssignment.id);
      
      if (existingSubmission) {
        // Update existing submission
        const { error } = await supabase
          .from('assignment_submissions')
          .update({
            content: submissionContent,
            submitted_at: new Date().toISOString(),
            status: 'submitted'
          })
          .eq('id', existingSubmission.id);

        if (error) throw error;
      } else {
        // Create new submission
        const { error } = await supabase
          .from('assignment_submissions')
          .insert({
            assignment_id: selectedAssignment.id,
            student_id: user?.id,
            content: submissionContent,
            status: 'submitted'
          });

        if (error) throw error;
      }

      toast({
        title: "Submitted!",
        description: "Your assignment has been submitted successfully.",
      });

      setSelectedAssignment(null);
      setSubmissionContent('');
      fetchData();
    } catch (error: any) {
      console.error('Error submitting:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit assignment.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
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
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `${assignment.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
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
    }
  };

  const getSubmissionForAssignment = (assignmentId: string) => {
    return submissions.find(s => s.assignment_id === assignmentId);
  };

  const pendingAssignments = assignments.filter(a => {
    const submission = getSubmissionForAssignment(a.id);
    return !submission || submission.status === 'pending';
  });

  const submittedAssignments = submissions.filter(s => s.status !== 'pending');

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

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">My Assignments</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Assignments</h1>
          <p className="text-muted-foreground text-lg">
            View and submit your assignments
          </p>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="submitted">
              Submitted ({submittedAssignments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : pendingAssignments.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-success mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">
                    You have no pending assignments.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {pendingAssignments.map((assignment) => {
                  const isOverdue = assignment.due_date && isPast(new Date(assignment.due_date));
                  
                  return (
                    <Card key={assignment.id} className={`hover:shadow-lg transition-shadow ${isOverdue ? 'border-destructive/50' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg">{assignment.title}</CardTitle>
                          {isOverdue && (
                            <Badge variant="destructive">Overdue</Badge>
                          )}
                        </div>
                        <CardDescription>
                          {assignment.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Due: {format(new Date(assignment.due_date), 'PPp')}
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
                        </div>
                        
                        {assignment.description && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {assignment.description}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={() => {
                                  setSelectedAssignment(assignment);
                                  const existing = getSubmissionForAssignment(assignment.id);
                                  setSubmissionContent(existing?.content || '');
                                }}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Submit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{assignment.title}</DialogTitle>
                                <DialogDescription>
                                  {assignment.subject.replace('_', ' ')} | Max Score: {assignment.max_score} points
                                </DialogDescription>
                              </DialogHeader>
                              
                              {assignment.instructions && (
                                <div className="bg-muted/50 p-4 rounded-lg">
                                  <h4 className="font-semibold mb-2">Instructions:</h4>
                                  <p className="text-sm whitespace-pre-wrap">{assignment.instructions}</p>
                                </div>
                              )}

                              <div className="space-y-2">
                                <label className="font-semibold">Your Answer:</label>
                                <Textarea
                                  value={submissionContent}
                                  onChange={(e) => setSubmissionContent(e.target.value)}
                                  placeholder="Write your answer here..."
                                  className="min-h-[200px]"
                                />
                              </div>

                              <Button 
                                onClick={submitAssignment}
                                disabled={isSubmitting || !submissionContent.trim()}
                                className="w-full"
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Submit Assignment
                                  </>
                                )}
                              </Button>
                            </DialogContent>
                          </Dialog>
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
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="submitted">
            {submittedAssignments.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
                  <p className="text-muted-foreground">
                    Your submitted assignments will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {submittedAssignments.map((submission) => (
                  <Card key={submission.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {submission.assignments?.title || 'Assignment'}
                          </CardTitle>
                          <CardDescription>
                            Submitted: {format(new Date(submission.submitted_at), 'PPp')}
                          </CardDescription>
                        </div>
                        <Badge variant={
                          submission.status === 'graded' ? 'default' : 
                          submission.status === 'returned' ? 'secondary' : 'outline'
                        }>
                          {submission.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {submission.status === 'graded' && (
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">Score:</span>
                            <span className="text-2xl font-bold text-primary">
                              {submission.score}/{submission.assignments?.max_score}
                            </span>
                          </div>
                          {submission.feedback && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm font-medium mb-1">Teacher's Feedback:</p>
                              <p className="text-sm text-muted-foreground">{submission.feedback}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {submission.status === 'submitted' && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Awaiting teacher review</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
