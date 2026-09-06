import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Calculator, Globe, Beaker, BookMarked, Brain, Star, Trophy, LogOut, Sparkles, ClipboardList, BarChart3, GraduationCap, User, Gift, Users, TrendingUp, Bot, History, Shield, Library, FileText, Bell, MessageCircle, Code, Swords, School, Wrench } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { TeacherNotifications } from "@/components/TeacherNotifications";
import WeeklyChallenges from "@/components/WeeklyChallenges";
import OfflineIndicator from "@/components/OfflineIndicator";
import OfflineContent from "@/components/OfflineContent";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const subjects = [
  { name: "Mathematics", icon: Calculator, color: "bg-blue-500", progress: 65, lessons: 12 },
  { name: "English", icon: BookOpen, color: "bg-purple-500", progress: 78, lessons: 15 },
  { name: "Science", icon: Beaker, color: "bg-green-500", progress: 45, lessons: 8 },
  { name: "Social Studies", icon: Globe, color: "bg-orange-500", progress: 82, lessons: 18 },
  { name: "Literature", icon: BookMarked, color: "bg-pink-500", progress: 55, lessons: 10 },
  { name: "General Knowledge", icon: Brain, color: "bg-indigo-500", progress: 90, lessons: 20 },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut, hasRole, user } = useAuth();
  const [isTeacher, setIsTeacher] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [primaryRole, setPrimaryRole] = useState<string>('student');
  const [userName, setUserName] = useState('Student');
  const [stats, setStats] = useState({
    lessonsCompleted: 0,
    quizScore: 0,
    learningStreak: 0,
    rewardPoints: 0,
  });

  useEffect(() => {
    if (user) {
      checkRoles();
      fetchUserName();
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      // Fetch quizzes count and average score
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('score')
        .eq('student_id', user?.id)
        .not('score', 'is', null);

      const lessonsCompleted = quizzes?.length || 0;
      const avgScore = quizzes && quizzes.length > 0
        ? Math.round(quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length)
        : 0;

      // Fetch learning streak
      const { data: streak } = await supabase
        .from('learning_streaks')
        .select('current_streak')
        .eq('student_id', user?.id)
        .maybeSingle();

      // Fetch reward points from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('reward_points')
        .eq('user_id', user?.id)
        .maybeSingle();

      setStats({
        lessonsCompleted,
        quizScore: avgScore,
        learningStreak: streak?.current_streak || 0,
        rewardPoints: profile?.reward_points || 0,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchUserName = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (profile?.full_name) {
        setUserName(profile.full_name.split(' ')[0]);
      } else if (user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name.split(' ')[0]);
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
  };

  const checkRoles = async () => {
    try {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id);

      if (error) throw error;

      const rolesList = roles?.map((r) => r.role) || [];
      setIsTeacher(rolesList.includes("teacher") || rolesList.includes("admin"));
      setIsParent(rolesList.includes("parent"));
      
      // Set primary role (priority: admin > teacher > parent > student)
      if (rolesList.includes("admin")) {
        setPrimaryRole("admin");
      } else if (rolesList.includes("teacher")) {
        setPrimaryRole("teacher");
      } else if (rolesList.includes("parent")) {
        setPrimaryRole("parent");
      } else {
        setPrimaryRole("student");
      }
    } catch (error) {
      console.error("Error checking roles:", error);
    }
  };

  const getRoleBadgeStyles = () => {
    switch (primaryRole) {
      case 'admin':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'teacher':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'parent':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default:
        return 'bg-green-500/10 text-green-600 border-green-500/20';
    }
  };

  const getRoleIcon = () => {
    switch (primaryRole) {
      case 'admin':
        return <Shield className="w-3 h-3" />;
      case 'teacher':
        return <GraduationCap className="w-3 h-3" />;
      case 'parent':
        return <Users className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              EduGenie
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium capitalize ${getRoleBadgeStyles()}`}>
              {getRoleIcon()}
              {primaryRole}
            </div>
            <div className="flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full">
              <Trophy className="w-5 h-5 text-accent" />
              <span className="font-bold text-accent">{stats.rewardPoints.toLocaleString()} pts</span>
            </div>
            <OfflineIndicator />
            <LanguageSwitcher />
            {hasRole('teacher') && (
              <>
                <TeacherNotifications />
                <Button variant="outline" size="sm" onClick={() => navigate('/teacher')}>
                  <GraduationCap className="h-4 w-4 mr-1" />
                  Teacher Dashboard
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/notifications')}>
              <Bell className="h-4 w-4 mr-1" />
              Notifications
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
              <User className="h-4 w-4 mr-1" />
              Profile
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Welcome back, {userName}! 👋</h1>
              <p className="text-muted-foreground text-lg">Ready to continue your learning journey?</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/generate-lesson')} 
              className="shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate AI Lesson
            </Button>
            <Button 
              size="lg" 
              onClick={() => navigate('/quiz-setup')} 
              variant="secondary"
              className="shadow-lg"
            >
              <ClipboardList className="w-5 h-5 mr-2" />
              Take a Quiz
            </Button>
            <Button 
              size="lg" 
              onClick={() => navigate('/performance')} 
              variant="outline"
              className="shadow-lg"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              View Performance
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                Quizzes Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{stats.lessonsCompleted}</p>
              <p className="text-sm text-muted-foreground mt-1">Total completed</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-secondary" />
                </div>
                Quiz Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-secondary">{stats.quizScore}%</p>
              <p className="text-sm text-muted-foreground mt-1">Average performance</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Star className="w-6 h-6 text-accent" />
                </div>
                Learning Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-accent">{stats.learningStreak} days</p>
              <p className="text-sm text-muted-foreground mt-1">{stats.learningStreak > 0 ? 'Keep it up!' : 'Start learning!'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Quick Access</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Link to="/generate-lesson">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Start Learning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Generate personalized lessons adapted to your level
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/performance">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track your progress and see your improvement
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/leaderboard">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Compete with peers and climb the rankings
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/rewards">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Rewards Store
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Redeem your points for awesome rewards
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/profile">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    My Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View your achievements and learning goals
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/study-groups">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Study Groups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Collaborate and learn together with peers
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/ai-study-buddy">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI Study Buddy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Get personalized help from your AI tutor
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/coding">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    Coding Playground
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Learn to code with AI-powered lessons and practice
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/competitions">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-5 w-5 text-primary" />
                    Competitions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Compete against schools, groups, or individuals on any subject
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/practical-learning">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    Practical Learning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Learn catering, music, technology, crafts, and real-world skills
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/practical-projects">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Practical Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Submit real work and build evidence for your skills portfolio
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/portfolio">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    My Portfolio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Present your verified projects and demonstrated competencies
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/school">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <School className="h-5 w-5 text-primary" />
                    School Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Register and manage your school, staff, students & timetable
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/quiz-history">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Quiz History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View past quizzes and retake them
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/lesson-history">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Library className="h-5 w-5" />
                    Lesson Library
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View and download your saved lessons
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/community">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Community
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Share what you're studying and interact with peers
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/assignments">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View and submit your assignments
                  </p>
                </CardContent>
              </Card>
            </Link>

            {isTeacher && (
              <Link to="/teacher">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Teacher Dashboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Manage lessons, review submissions, and approve content
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}

            {isParent && (
              <Link to="/parent">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Parent Dashboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Monitor your child's progress and set study limits
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>

        <div className="mb-8">
          <WeeklyChallenges />
        </div>

        <div className="mb-8">
          <OfflineContent />
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Your Subjects</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <Card 
              key={subject.name}
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`w-14 h-14 rounded-2xl ${subject.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <subject.icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-muted-foreground">{subject.lessons}</span>
                </div>
                <CardTitle className="mt-4">{subject.name}</CardTitle>
                <CardDescription>{subject.lessons} lessons available</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-bold">{subject.progress}%</span>
                  </div>
                  <Progress value={subject.progress} className="h-2" />
                </div>
                <Link to="/lesson">
                  <Button className="w-full mt-4 group-hover:shadow-md transition-shadow">
                    Continue Learning
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
