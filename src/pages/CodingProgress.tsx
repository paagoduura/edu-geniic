import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Trophy, Code, Star, Target, Flame, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCodingProgress } from '@/hooks/useCodingProgress';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend } from 'recharts';

const LANG_COLORS: Record<string, string> = {
  javascript: '#F7DF1E',
  python: '#3776AB',
  html: '#E34F26',
  css: '#1572B6',
  react: '#61DAFB',
  typescript: '#3178C6',
  expo: '#000020',
  'react-native': '#61DAFB',
};

const LANG_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  html: 'HTML',
  css: 'CSS',
  react: 'React',
  typescript: 'TypeScript',
  expo: 'Expo',
  'react-native': 'React Native',
};

const CodingProgress = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { progress, totalCompleted, getLanguageStats } = useCodingProgress();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [streak, setStreak] = useState<any>(null);
  const [rewardPoints, setRewardPoints] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: achData }, { data: streakData }, { data: profileData }] = await Promise.all([
        supabase.from('achievements').select('*').eq('student_id', user.id).eq('badge_type', 'coding').order('earned_at', { ascending: false }),
        supabase.from('learning_streaks').select('*').eq('student_id', user.id).maybeSingle(),
        supabase.from('profiles').select('reward_points').eq('user_id', user.id).single(),
      ]);
      setAchievements(achData || []);
      setStreak(streakData);
      setRewardPoints(profileData?.reward_points || 0);
    };
    load();
  }, [user]);

  // Also fetch milestone achievements
  const [milestoneAchievements, setMilestoneAchievements] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from('achievements').select('*').eq('student_id', user.id).eq('badge_type', 'coding_milestone').order('earned_at', { ascending: false })
      .then(({ data }) => setMilestoneAchievements(data || []));
  }, [user]);

  const languages = ['javascript', 'python', 'html', 'css', 'react', 'typescript', 'expo', 'react-native'];

  const barData = languages.map(lang => {
    const stats = getLanguageStats(lang);
    return { name: LANG_LABELS[lang] || lang, completed: stats.completed, total: stats.total, fill: LANG_COLORS[lang] };
  }).filter(d => d.total > 0);

  const pieData = languages.map(lang => {
    const stats = getLanguageStats(lang);
    return { name: LANG_LABELS[lang] || lang, value: stats.completed, fill: LANG_COLORS[lang] };
  }).filter(d => d.value > 0);

  const totalProblems = progress.reduce((sum, p) => sum + p.solved_problems, 0);
  const totalTopics = progress.length;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/coding')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Coding Playground
          </Button>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Coding Progress</h1>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <Code className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalTopics}</p>
              <p className="text-xs text-muted-foreground">Topics Explored</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{totalProblems}</p>
              <p className="text-xs text-muted-foreground">Problems Solved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Star className="w-8 h-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{rewardPoints}</p>
              <p className="text-xs text-muted-foreground">Reward Points</p>
            </CardContent>
          </Card>
        </div>

        {/* Streak */}
        {streak && (
          <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
            <CardContent className="pt-6 flex items-center gap-4">
              <Flame className="w-10 h-10 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{streak.current_streak} day streak 🔥</p>
                <p className="text-sm text-muted-foreground">Longest: {streak.longest_streak} days</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {barData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Topics by Language</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="completed" name="Completed" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                    <Bar dataKey="total" name="Total" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {pieData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Completion Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Per-language breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Language Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {languages.map(lang => {
              const stats = getLanguageStats(lang);
              if (stats.total === 0) return null;
              const pct = Math.round((stats.completed / stats.total) * 100);
              return (
                <div key={lang} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{LANG_LABELS[lang]}</span>
                    <span className="text-muted-foreground">{stats.completed}/{stats.total} ({pct}%)</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Milestone Badges */}
        {milestoneAchievements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-5 h-5" /> Milestone Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {milestoneAchievements.map(a => (
                  <div key={a.id} className="text-center p-3 rounded-lg bg-muted/50 border">
                    <span className="text-3xl block mb-1">{a.icon}</span>
                    <p className="text-sm font-semibold">{a.badge_name}</p>
                    <Badge variant="outline" className="text-xs mt-1" style={{ borderColor: a.color, color: a.color }}>
                      {a.tier}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Coding Badges */}
        {achievements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Topic Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {achievements.slice(0, 12).map(a => (
                  <div key={a.id} className="text-center p-3 rounded-lg bg-muted/50 border">
                    <span className="text-2xl block mb-1">{a.icon}</span>
                    <p className="text-xs font-medium truncate">{a.badge_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.badge_description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {progress.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Code className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">No Progress Yet</h3>
              <p className="text-muted-foreground mb-4">Start coding to track your progress here!</p>
              <Button onClick={() => navigate('/coding')}>Go to Coding Playground</Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CodingProgress;
