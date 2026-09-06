import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Users, Clock, TrendingUp, Award, Settings, AlertCircle, BookOpen, Target, ArrowLeft, Star, Bell } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";

interface ChildProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  class_level: string;
  reward_points: number;
  student_id: string | null;
}

interface ChildPerformance {
  id: string;
  subject: string;
  topic: string;
  score: number;
  created_at: string;
}

interface Quiz {
  id: string;
  score: number | null;
  difficulty: string | null;
  created_at: string;
  completed_at: string | null;
}

interface LearningStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
}

interface StudyTimeLimit {
  id: string;
  daily_limit_minutes: number;
  weekly_limit_minutes: number | null;
  is_active: boolean;
}

export default function ParentDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [performance, setPerformance] = useState<ChildPerformance[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [streak, setStreak] = useState<LearningStreak | null>(null);
  const [studyTimeLimit, setStudyTimeLimit] = useState<StudyTimeLimit | null>(null);
  const [newDailyLimit, setNewDailyLimit] = useState("");
  const [newWeeklyLimit, setNewWeeklyLimit] = useState("");
  const [linkStudentId, setLinkStudentId] = useState("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChildren();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChild) {
      fetchChildData(selectedChild);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      setLoading(true);

      const { data: linksData, error: linksError } = await supabase
        .from("parent_child_links")
        .select("child_id")
        .eq("parent_id", user?.id);

      if (linksError) throw linksError;

      const childIds = linksData?.map((link) => link.child_id) ?? [];
      if (childIds.length > 0) {

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, class_level, reward_points, student_id")
          .in("user_id", childIds);

        if (profilesError) throw profilesError;

        const nextChildren = profilesData || [];
        setChildren(nextChildren);
        if (nextChildren.length > 0 && (!selectedChild || !nextChildren.some((child) => child.user_id === selectedChild))) {
          setSelectedChild(nextChildren[0].user_id);
        }
      } else {
        setChildren([]);
        setSelectedChild(null);
        setPerformance([]);
        setQuizzes([]);
        setStreak(null);
        setStudyTimeLimit(null);
      }
    } catch (error) {
      console.error("Error fetching children:", error);
      toast.error("Failed to load children data");
    } finally {
      setLoading(false);
    }
  };

  const fetchChildData = async (childId: string) => {
    try {
      // Fetch performance data
      const { data: performanceData, error: performanceError } = await supabase
        .from("performance")
        .select("*")
        .eq("student_id", childId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (performanceError) throw performanceError;
      setPerformance(performanceData || []);

      // Fetch quizzes
      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select("id, score, difficulty, created_at, completed_at")
        .eq("student_id", childId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (quizzesError) throw quizzesError;
      setQuizzes(quizzesData || []);

      // Fetch learning streak
      const { data: streakData, error: streakError } = await supabase
        .from("learning_streaks")
        .select("current_streak, longest_streak, last_activity_date")
        .eq("student_id", childId)
        .maybeSingle();

      if (streakError) throw streakError;
      setStreak(streakData);

      // Fetch study time limits
      const { data: limitData, error: limitError } = await supabase
        .from("study_time_limits")
        .select("*")
        .eq("parent_id", user?.id)
        .eq("child_id", childId)
        .maybeSingle();

      if (limitError && limitError.code !== "PGRST116") throw limitError;
      setStudyTimeLimit(limitData || null);
    } catch (error) {
      console.error("Error fetching child data:", error);
    }
  };

  const linkChild = async () => {
    if (!linkStudentId.trim()) {
      toast.error("Please enter a valid student ID or email");
      return;
    }

    try {
      // First, find the child by student_id or email in profiles
      const searchTerm = linkStudentId.trim();
      
      // Try to find by student_id first
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("student_id", searchTerm)
        .maybeSingle();

      // If not found by student_id, try by user_id (UUID)
      if (!profile) {
        const { data: profileById, error: error2 } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("user_id", searchTerm)
          .maybeSingle();
        
        profile = profileById;
        profileError = error2;
      }

      if (!profile) {
        toast.error("Student not found. Please check the ID and try again.");
        return;
      }

      // Check if already linked
      const { data: existingLink } = await supabase
        .from("parent_child_links")
        .select("id")
        .eq("parent_id", user?.id)
        .eq("child_id", profile.user_id)
        .maybeSingle();

      if (existingLink) {
        toast.error("This child is already linked to your account.");
        return;
      }

      const { error } = await supabase.from("parent_child_links").insert({
        parent_id: user?.id,
        child_id: profile.user_id,
      });

      if (error) throw error;

      toast.success(`${profile.full_name} linked successfully!`);
      setLinkStudentId("");
      setLinkDialogOpen(false);
      fetchChildren();
    } catch (error: any) {
      console.error("Error linking child:", error);
      toast.error(error.message || "Failed to link child");
    }
  };

  const setStudyLimit = async () => {
    if (!selectedChild || !newDailyLimit) {
      toast.error("Please enter a daily limit");
      return;
    }

    try {
      const limitData = {
        parent_id: user?.id,
        child_id: selectedChild,
        daily_limit_minutes: parseInt(newDailyLimit),
        weekly_limit_minutes: newWeeklyLimit ? parseInt(newWeeklyLimit) : null,
        is_active: true,
      };

      if (studyTimeLimit) {
        const { error } = await supabase
          .from("study_time_limits")
          .update(limitData)
          .eq("id", studyTimeLimit.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("study_time_limits").insert(limitData);

        if (error) throw error;
      }

      toast.success("Study time limit updated!");
      fetchChildData(selectedChild);
      setNewDailyLimit("");
      setNewWeeklyLimit("");
    } catch (error: any) {
      console.error("Error setting study limit:", error);
      toast.error(error.message || "Failed to set study limit");
    }
  };

  const calculateAverageScore = () => {
    if (performance.length === 0) return 0;
    const sum = performance.reduce((acc, p) => acc + p.score, 0);
    return Math.round(sum / performance.length);
  };

  const getSubjectBreakdown = () => {
    const subjectScores: { [key: string]: { total: number; count: number } } = {};
    performance.forEach((p) => {
      if (!subjectScores[p.subject]) {
        subjectScores[p.subject] = { total: 0, count: 0 };
      }
      subjectScores[p.subject].total += p.score;
      subjectScores[p.subject].count += 1;
    });

    return Object.entries(subjectScores).map(([subject, data]) => ({
      subject,
      average: Math.round(data.total / data.count),
      count: data.count,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const selectedChildData = children.find((c) => c.user_id === selectedChild);
  const subjectBreakdown = getSubjectBreakdown();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              EduGenie Parent
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Parent Dashboard 👨‍👩‍👧</h1>
            <p className="text-muted-foreground mt-2">
              Monitor your child's learning progress and achievements
            </p>
          </div>
          <Button onClick={() => navigate('/parent/notifications')} variant="outline" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </Button>
        </div>

        {children.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Children Linked</h3>
              <p className="text-muted-foreground mb-6">
                Link your child's account to start monitoring their progress
              </p>
              <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Link Child Account</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link Child Account</DialogTitle>
                    <DialogDescription>
                      Enter your child's Student ID to link their account. 
                      Your child can find their Student ID in their Profile page.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="childId">Student ID</Label>
                      <Input
                        id="childId"
                        value={linkStudentId}
                        onChange={(e) => setLinkStudentId(e.target.value)}
                        placeholder="e.g., STU-12345"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Ask your child to share their Student ID from their profile
                      </p>
                    </div>
                    <Button onClick={linkChild} className="w-full">
                      Link Account
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-4 flex-wrap">
              {children.map((child) => (
                <Button
                  key={child.user_id}
                  variant={selectedChild === child.user_id ? "default" : "outline"}
                  onClick={() => setSelectedChild(child.user_id)}
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={child.avatar_url || ""} />
                    <AvatarFallback>{child.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {child.full_name}
                </Button>
              ))}
              <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">+ Add Child</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link Another Child</DialogTitle>
                    <DialogDescription>
                      Enter your child's Student ID to link their account
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="newChildId">Student ID</Label>
                      <Input
                        id="newChildId"
                        value={linkStudentId}
                        onChange={(e) => setLinkStudentId(e.target.value)}
                        placeholder="e.g., STU-12345"
                      />
                    </div>
                    <Button onClick={linkChild} className="w-full">
                      Link Account
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {selectedChildData && (
              <>
                <div className="grid gap-6 md:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{calculateAverageScore()}%</div>
                      <Progress value={calculateAverageScore()} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Reward Points</CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{selectedChildData.reward_points}</div>
                      <p className="text-xs text-muted-foreground mt-1">Total earned</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{streak?.current_streak || 0} days</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Best: {streak?.longest_streak || 0} days
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{quizzes.length}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {quizzes.filter(q => q.score !== null && q.score >= 70).length} passed
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="performance" className="w-full">
                  <TabsList className="grid w-full max-w-lg grid-cols-3">
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="subjects">By Subject</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  <TabsContent value="performance" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                          Recent quizzes and performance for {selectedChildData.full_name}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {performance.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            No activity data available yet. Your child hasn't taken any quizzes.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {performance.map((perf) => (
                              <div
                                key={perf.id}
                                className="flex items-center justify-between p-4 border rounded-lg"
                              >
                                <div>
                                  <p className="font-medium text-foreground capitalize">
                                    {perf.subject.replace(/_/g, " ")} - {perf.topic}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(perf.created_at), "MMM dd, yyyy 'at' h:mm a")}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    perf.score >= 80
                                      ? "default"
                                      : perf.score >= 60
                                      ? "secondary"
                                      : "destructive"
                                  }
                                  className="text-lg px-4 py-2"
                                >
                                  {perf.score}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="subjects" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance by Subject</CardTitle>
                        <CardDescription>
                          Average scores across different subjects
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {subjectBreakdown.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            No subject data available yet
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {subjectBreakdown.map((subject) => (
                              <div key={subject.subject} className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium capitalize">
                                    {subject.subject.replace(/_/g, " ")}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {subject.average}% ({subject.count} quizzes)
                                  </span>
                                </div>
                                <Progress 
                                  value={subject.average} 
                                  className={`h-2 ${
                                    subject.average >= 80 ? '[&>div]:bg-green-500' : 
                                    subject.average >= 60 ? '[&>div]:bg-yellow-500' : 
                                    '[&>div]:bg-red-500'
                                  }`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="settings" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Study Time Limits
                        </CardTitle>
                        <CardDescription>
                          Set daily and weekly study time limits for {selectedChildData.full_name}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {studyTimeLimit && (
                          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                              <div>
                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                  Current Limits
                                </p>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                  Daily: {studyTimeLimit.daily_limit_minutes} minutes
                                  {studyTimeLimit.weekly_limit_minutes && (
                                    <> | Weekly: {studyTimeLimit.weekly_limit_minutes} minutes</>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="dailyLimit">Daily Limit (minutes)</Label>
                            <Input
                              id="dailyLimit"
                              type="number"
                              value={newDailyLimit}
                              onChange={(e) => setNewDailyLimit(e.target.value)}
                              placeholder="e.g., 120"
                              min="0"
                            />
                          </div>

                          <div>
                            <Label htmlFor="weeklyLimit">
                              Weekly Limit (minutes, optional)
                            </Label>
                            <Input
                              id="weeklyLimit"
                              type="number"
                              value={newWeeklyLimit}
                              onChange={(e) => setNewWeeklyLimit(e.target.value)}
                              placeholder="e.g., 600"
                              min="0"
                            />
                          </div>

                          <Button onClick={setStudyLimit} className="w-full">
                            <Clock className="h-4 w-4 mr-2" />
                            {studyTimeLimit ? "Update Limits" : "Set Limits"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
