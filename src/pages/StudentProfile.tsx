import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Star, Trophy, Target, Award, Flame, Calendar, Plus, CheckCircle, Trash2, LogOut, ArrowLeft, Copy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { NotificationSettings } from '@/components/NotificationSettings';
import { BiometricSettings } from '@/components/BiometricSettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface Achievement {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string;
  earned_at: string;
  icon: string;
  color: string;
  tier: string;
}

interface LearningGoal {
  id: string;
  goal_title: string;
  goal_description: string;
  target_date: string;
  is_completed: boolean;
  progress: number;
  created_at: string;
}

interface LearningStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
}

const StudentProfile = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [streak, setStreak] = useState<LearningStreak | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', targetDate: '' });
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadProfile();
      loadAchievements();
      loadGoals();
      loadStreak();
      updateStreakForToday();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const updateStreakForToday = async () => {
    try {
      const { error } = await supabase.rpc('update_learning_streak', {
        user_id: user?.id
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  const loadAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('student_id', user?.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_goals')
        .select('*')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const loadStreak = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_streaks')
        .select('*')
        .eq('student_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setStreak(data);
    } catch (error) {
      console.error('Error loading streak:', error);
    }
  };

  const addGoal = async () => {
    if (!newGoal.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a goal title.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('learning_goals')
        .insert({
          student_id: user?.id,
          goal_title: newGoal.title,
          goal_description: newGoal.description,
          target_date: newGoal.targetDate || null,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Learning goal added!',
      });
      setNewGoal({ title: '', description: '', targetDate: '' });
      setIsAddingGoal(false);
      loadGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to add goal.',
        variant: 'destructive',
      });
    }
  };

  const updateGoalProgress = async (goalId: string, progress: number) => {
    try {
      const { error } = await supabase
        .from('learning_goals')
        .update({ 
          progress,
          is_completed: progress >= 100,
          completed_at: progress >= 100 ? new Date().toISOString() : null
        })
        .eq('id', goalId);

      if (error) throw error;
      loadGoals();

      if (progress >= 100) {
        // Award achievement for completing a goal
        await supabase.from('achievements').insert({
          student_id: user?.id,
          badge_type: 'goal_completed',
          badge_name: 'Goal Master',
          badge_description: 'Completed a learning goal',
          icon: 'target',
          color: 'green'
        });
        loadAchievements();
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('learning_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Goal deleted.',
      });
      loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete goal.',
        variant: 'destructive',
      });
    }
  };

  const badgeColors: Record<string, string> = {
    gold: 'bg-yellow-500',
    silver: 'bg-gray-400',
    bronze: 'bg-orange-700',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Profile 🎓</h1>
          <p className="text-muted-foreground text-lg">Track your learning journey and achievements</p>
        </div>

        {/* Profile Header */}
        <Card className="mb-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <ProfilePhotoUpload
                currentAvatarUrl={profile?.avatar_url}
                userName={profile?.full_name || 'Student'}
                onPhotoUploaded={(url) => {
                  setProfile({ ...profile, avatar_url: url });
                }}
              />
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
                <p className="text-muted-foreground">
                  Class: {profile?.class_level?.replace(/_/g, " ").toUpperCase() || "Not set"}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-lg">
                    <Trophy className="h-4 w-4 mr-1 text-yellow-500" />
                    {profile?.reward_points || 0} Points
                  </Badge>
                </div>
                {/* Student ID for parents to link */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Your Student ID (share with parents)</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                      {profile?.student_id || user?.id?.slice(0, 8)}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(profile?.student_id || user?.id || '');
                        toast({ title: 'Copied!', description: 'Student ID copied to clipboard' });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 bg-gradient-to-br from-orange-500/10 to-orange-500/5 hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-orange-500" />
                </div>
                Learning Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-orange-500">{streak?.current_streak || 0} days</p>
              <p className="text-sm text-muted-foreground mt-1">
                Longest: {streak?.longest_streak || 0} days
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Award className="w-6 h-6 text-yellow-500" />
                </div>
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-yellow-500">{achievements.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Badges earned</p>
            </CardContent>
          </Card>

          <Card className="border-2 bg-gradient-to-br from-blue-500/10 to-blue-500/5 hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-500" />
                </div>
                Active Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-blue-500">
                {goals.filter(g => !g.is_completed).length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">In progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Achievements Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Achievements & Badges
            </CardTitle>
            <CardDescription>Your earned accomplishments</CardDescription>
          </CardHeader>
          <CardContent>
            {achievements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Award className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No achievements yet. Keep learning to earn badges!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => {
                  const tierColors = {
                    bronze: "bg-amber-700",
                    silver: "bg-gray-400",
                    gold: "bg-yellow-500",
                    platinum: "bg-purple-500",
                  };
                  const tierColor = tierColors[achievement.tier as keyof typeof tierColors] || "bg-blue-500";
                  
                  return (
                    <Card key={achievement.id} className="border-2 hover:shadow-lg transition-all">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-16 h-16 rounded-full ${badgeColors[achievement.color] || 'bg-primary'} flex items-center justify-center shrink-0`}>
                            <span className="text-3xl">{achievement.icon || "🏆"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold truncate">{achievement.badge_name}</h3>
                              <Badge className={`${tierColor} text-white border-0 shrink-0`}>
                                {achievement.tier?.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">{achievement.badge_description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(achievement.earned_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Learning Goals Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-6 h-6 text-blue-500" />
                  Learning Goals
                </CardTitle>
                <CardDescription>Set and track your personalized learning objectives</CardDescription>
              </div>
              <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Goal
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Learning Goal</DialogTitle>
                    <DialogDescription>Set a goal to track your learning progress</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Goal Title</label>
                      <Input
                        placeholder="e.g., Master Algebra"
                        value={newGoal.title}
                        onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        placeholder="What do you want to achieve?"
                        value={newGoal.description}
                        onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Target Date (Optional)</label>
                      <Input
                        type="date"
                        value={newGoal.targetDate}
                        onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addGoal} className="flex-1">Create Goal</Button>
                      <Button variant="outline" onClick={() => setIsAddingGoal(false)}>Cancel</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No goals set yet. Create your first learning goal!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <Card key={goal.id} className={`border-2 ${goal.is_completed ? 'bg-green-500/5' : ''}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg">{goal.goal_title}</h3>
                            {goal.is_completed && (
                              <Badge className="bg-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                          </div>
                          {goal.goal_description && (
                            <p className="text-sm text-muted-foreground mb-2">{goal.goal_description}</p>
                          )}
                          {goal.target_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              Target: {new Date(goal.target_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteGoal(goal.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-bold">{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} className="h-2" />
                        {!goal.is_completed && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateGoalProgress(goal.id, Math.min(goal.progress + 25, 100))}
                            >
                              +25%
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateGoalProgress(goal.id, 100)}
                            >
                              Mark Complete
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <div className="mt-8">
          <NotificationSettings />
        </div>

        {/* Biometric Security */}
        <div className="mt-8">
          <BiometricSettings />
        </div>
      </main>
    </div>
  );
};

export default StudentProfile;
