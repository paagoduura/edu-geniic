import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, ClipboardCheck, Search, Edit, CheckCircle, XCircle, Star, LogOut, Users, TrendingUp, Eye, FileText, School, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { TeacherNotifications } from '@/components/TeacherNotifications';
import { format } from 'date-fns';
import { CreateClassDialog } from '@/components/teacher/CreateClassDialog';
import { ClassCard } from '@/components/teacher/ClassCard';

interface Lesson {
  id: string;
  title: string;
  subject: string;
  class_level: string;
  is_approved: boolean;
  created_at: string;
  content: any;
  objectives: any;
  examples: any;
  exercises: any;
}

interface Quiz {
  id: string;
  student_id: string;
  difficulty: string;
  questions: any;
  score: number | null;
  created_at: string;
  completed_at: string | null;
}

interface Student {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  class_level: string | null;
  reward_points: number;
}

interface StudentPerformance {
  id: string;
  subject: string;
  topic: string;
  score: number;
  created_at: string;
}

const TeacherDashboard = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [editedLesson, setEditedLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    loadLessons();
    loadQuizzes();
    loadStudents();
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const { data: classesData, error } = await supabase
        .from('teacher_classes' as any)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get student counts per class
      const classIds = ((classesData as any[]) || []).map((c: any) => c.id);
      if (classIds.length > 0) {
        const { data: memberships } = await supabase
          .from('teacher_class_students' as any)
          .select('class_id')
          .in('class_id', classIds)
          .eq('is_active', true);

        const countMap = new Map<string, number>();
        ((memberships as any[]) || []).forEach((m: any) => {
          countMap.set(m.class_id, (countMap.get(m.class_id) || 0) + 1);
        });

        setClasses(((classesData as any[]) || []).map((c: any) => ({ ...c, student_count: countMap.get(c.id) || 0 })));
      } else {
        setClasses([]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error loading lessons:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lessons.',
        variant: 'destructive',
      });
    }
  };

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    }
  };

  const loadStudents = async () => {
    try {
      // Fetch all profiles (students)
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, class_level, reward_points')
        .order('full_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadStudentPerformance = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('performance')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setStudentPerformance(data || []);
    } catch (error) {
      console.error('Error loading student performance:', error);
    }
  };

  const viewStudentDetails = async (student: Student) => {
    setSelectedStudent(student);
    await loadStudentPerformance(student.user_id);
    setStudentDialogOpen(true);
  };

  const approveLesson = async (lessonId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ is_approved: true })
        .eq('id', lessonId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Lesson approved successfully!',
      });
      loadLessons();
    } catch (error) {
      console.error('Error approving lesson:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve lesson.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const rejectLesson = async (lessonId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Lesson rejected and removed.',
      });
      loadLessons();
    } catch (error) {
      console.error('Error rejecting lesson:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject lesson.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateLesson = async () => {
    if (!editedLesson) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('lessons')
        .update({
          title: editedLesson.title,
          content: editedLesson.content,
          objectives: editedLesson.objectives,
        })
        .eq('id', editedLesson.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Lesson updated successfully!',
      });
      setSelectedLesson(null);
      setEditedLesson(null);
      loadLessons();
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast({
        title: 'Error',
        description: 'Failed to update lesson.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStudentQuizCount = (studentId: string) => {
    return quizzes.filter(q => q.student_id === studentId).length;
  };

  const getStudentAvgScore = (studentId: string) => {
    const studentQuizzes = quizzes.filter(q => q.student_id === studentId && q.score !== null);
    if (studentQuizzes.length === 0) return 0;
    const sum = studentQuizzes.reduce((acc, q) => acc + (q.score || 0), 0);
    return Math.round(sum / studentQuizzes.length);
  };

  const calculateOverallAvgScore = () => {
    if (studentPerformance.length === 0) return 0;
    const sum = studentPerformance.reduce((acc, p) => acc + p.score, 0);
    return Math.round(sum / studentPerformance.length);
  };

  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    (student.class_level && student.class_level.toLowerCase().includes(studentSearchTerm.toLowerCase()))
  );

  const pendingLessons = filteredLessons.filter(l => !l.is_approved);
  const approvedLessons = filteredLessons.filter(l => l.is_approved);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              EduGenie Teacher
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <TeacherNotifications />
            <Button variant="outline" size="sm" onClick={() => navigate('/teacher/assignments')}>
              <FileText className="h-4 w-4 mr-1" />
              Assignments
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/teacher/communication')}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Communication
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              Student View
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Teacher Dashboard 👨‍🏫</h1>
          <p className="text-muted-foreground text-lg">Manage lessons, monitor students, and review content</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Total Lessons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{lessons.length}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {pendingLessons.length} pending approval
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-secondary" />
                Approved Lessons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-secondary">{approvedLessons.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Ready for students</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-accent">{students.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Registered students</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Total Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-500">{quizzes.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Taken by students</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingLessons.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedLessons.length})</TabsTrigger>
            <TabsTrigger value="classes">
              <School className="w-4 h-4 mr-1" />
              Classes ({classes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-6">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search students by name or class..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </CardHeader>
            </Card>

            {filteredStudents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No students found
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student) => (
                  <Card key={student.user_id} className="border-2 hover:shadow-lg transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={student.avatar_url || ''} />
                          <AvatarFallback>{student.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{student.full_name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {student.class_level?.replace('_', ' ') || 'No class'}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1">
                              <ClipboardCheck className="w-3 h-3" />
                              {getStudentQuizCount(student.user_id)} quizzes
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {getStudentAvgScore(student.user_id)}% avg
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-4" 
                        variant="outline"
                        onClick={() => viewStudentDetails(student)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 mt-6">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search lessons by title or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </CardHeader>
            </Card>

            {pendingLessons.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No lessons pending approval
                </CardContent>
              </Card>
            ) : (
              pendingLessons.map((lesson) => (
                <Card key={lesson.id} className="border-2 hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="mb-2">{lesson.title}</CardTitle>
                        <CardDescription>
                          {lesson.subject} • {lesson.class_level} • {new Date(lesson.created_at).toLocaleDateString()}
                        </CardDescription>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">Pending Review</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedLesson(lesson)}>
                            <Edit className="w-4 h-4 mr-1" />
                            Review & Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Review Lesson</DialogTitle>
                            <DialogDescription>Review and edit the lesson before approval</DialogDescription>
                          </DialogHeader>
                          {selectedLesson && (
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Title</label>
                                <Input
                                  value={editedLesson?.title || selectedLesson.title}
                                  onChange={(e) => setEditedLesson({ ...selectedLesson, title: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Objectives</label>
                                <Textarea
                                  value={
                                    editedLesson?.objectives 
                                      ? (Array.isArray(editedLesson.objectives) ? editedLesson.objectives.join('\n') : String(editedLesson.objectives))
                                      : selectedLesson.objectives 
                                      ? (Array.isArray(selectedLesson.objectives) ? selectedLesson.objectives.join('\n') : String(selectedLesson.objectives))
                                      : ''
                                  }
                                  onChange={(e) => setEditedLesson({ ...selectedLesson, objectives: e.target.value.split('\n') })}
                                  rows={5}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={updateLesson} disabled={isLoading}>
                                  Save Changes
                                </Button>
                                <Button variant="outline" onClick={() => {
                                  setSelectedLesson(null);
                                  setEditedLesson(null);
                                }}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        onClick={() => approveLesson(lesson.id)}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectLesson(lesson.id)}
                        disabled={isLoading}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4 mt-6">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search lessons by title or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </CardHeader>
            </Card>

            {approvedLessons.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No approved lessons yet
                </CardContent>
              </Card>
            ) : (
              approvedLessons.map((lesson) => (
                <Card key={lesson.id} className="border-2 hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="mb-2">{lesson.title}</CardTitle>
                        <CardDescription>
                          {lesson.subject} • {lesson.class_level} • {new Date(lesson.created_at).toLocaleDateString()}
                        </CardDescription>
                        <div className="flex gap-2 mt-2">
                          <Badge className="bg-green-600">Approved</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedLesson(lesson)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Lesson</DialogTitle>
                          <DialogDescription>Make changes to the approved lesson</DialogDescription>
                        </DialogHeader>
                        {selectedLesson && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Title</label>
                              <Input
                                value={editedLesson?.title || selectedLesson.title}
                                onChange={(e) => setEditedLesson({ ...selectedLesson, title: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Objectives</label>
                              <Textarea
                                value={
                                  editedLesson?.objectives 
                                    ? (Array.isArray(editedLesson.objectives) ? editedLesson.objectives.join('\n') : String(editedLesson.objectives))
                                    : selectedLesson.objectives 
                                    ? (Array.isArray(selectedLesson.objectives) ? selectedLesson.objectives.join('\n') : String(selectedLesson.objectives))
                                    : ''
                                }
                                onChange={(e) => setEditedLesson({ ...selectedLesson, objectives: e.target.value.split('\n') })}
                                rows={5}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={updateLesson} disabled={isLoading}>
                                Save Changes
                              </Button>
                              <Button variant="outline" onClick={() => {
                                setSelectedLesson(null);
                                setEditedLesson(null);
                              }}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="classes" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Your Classes</h2>
              <CreateClassDialog onClassCreated={loadClasses} />
            </div>
            {classes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <School className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No classes yet</p>
                  <p className="text-sm">Create your first class to organize students into sections.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls) => (
                  <ClassCard key={cls.id} classData={cls} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Student Details Dialog */}
        <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selectedStudent && (
                  <>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedStudent.avatar_url || ''} />
                      <AvatarFallback>{selectedStudent.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {selectedStudent.full_name}
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedStudent?.class_level?.replace('_', ' ').toUpperCase() || 'No class'} • {selectedStudent?.reward_points || 0} reward points
              </DialogDescription>
            </DialogHeader>

            {selectedStudent && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{calculateOverallAvgScore()}%</p>
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{getStudentQuizCount(selectedStudent.user_id)}</p>
                      <p className="text-xs text-muted-foreground">Quizzes</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{selectedStudent.reward_points}</p>
                      <p className="text-xs text-muted-foreground">Points</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Recent Performance</h4>
                  {studentPerformance.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No performance data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {studentPerformance.slice(0, 10).map((perf) => (
                        <div key={perf.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium capitalize">{perf.subject.replace('_', ' ')} - {perf.topic}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(perf.created_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <Badge variant={perf.score >= 70 ? 'default' : perf.score >= 50 ? 'secondary' : 'destructive'}>
                            {perf.score}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default TeacherDashboard;
