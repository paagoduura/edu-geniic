import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BarChart3, Users, GraduationCap, BookOpen, TrendingUp, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function SchoolAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0, totalTeachers: 0, totalQuizzes: 0,
    avgScore: 0, classDistribution: [] as any[], subjectPerformance: [] as any[],
  });

  useEffect(() => { if (user) fetchAnalytics(); }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;
    try {
      const { data: membership } = await supabase
        .from('school_members').select('school_id')
        .eq('user_id', user.id).eq('is_active', true)
        .in('school_role', ['admin', 'vice_admin']).maybeSingle();

      if (!membership) { setLoading(false); return; }

      // Get student and teacher counts
      const { count: studentCount } = await supabase.from('school_members')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', membership.school_id).eq('school_role', 'student').eq('is_active', true);

      const { count: teacherCount } = await supabase.from('school_members')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', membership.school_id).eq('school_role', 'teacher').eq('is_active', true);

      // Get student user IDs for performance data
      const { data: studentMembers } = await supabase.from('school_members')
        .select('user_id').eq('school_id', membership.school_id)
        .eq('school_role', 'student').eq('is_active', true);

      const studentIds = studentMembers?.map(s => s.user_id) || [];
      let avgScore = 0;
      let subjectPerformance: any[] = [];

      if (studentIds.length > 0) {
        const { data: perfData } = await supabase.from('performance')
          .select('score, subject').in('student_id', studentIds);

        if (perfData && perfData.length > 0) {
          avgScore = Math.round(perfData.reduce((a, b) => a + b.score, 0) / perfData.length);

          const subjectMap: Record<string, { total: number; count: number }> = {};
          perfData.forEach(p => {
            if (!subjectMap[p.subject]) subjectMap[p.subject] = { total: 0, count: 0 };
            subjectMap[p.subject].total += p.score;
            subjectMap[p.subject].count++;
          });
          subjectPerformance = Object.entries(subjectMap).map(([name, v]) => ({
            name: name.replace('_', ' '), avg: Math.round(v.total / v.count),
          })).slice(0, 8);
        }

        // Class distribution
        const { data: profiles } = await supabase.from('profiles')
          .select('class_level').in('user_id', studentIds);

        const classMap: Record<string, number> = {};
        profiles?.forEach(p => {
          if (p.class_level) {
            classMap[p.class_level] = (classMap[p.class_level] || 0) + 1;
          }
        });

        const classLabels: Record<string, string> = {
          primary_1: 'P1', primary_2: 'P2', primary_3: 'P3', primary_4: 'P4', primary_5: 'P5', primary_6: 'P6',
          jss_1: 'JS1', jss_2: 'JS2', jss_3: 'JS3', ss_1: 'SS1', ss_2: 'SS2', ss_3: 'SS3',
        };

        stats.classDistribution = Object.entries(classMap).map(([k, v]) => ({
          name: classLabels[k] || k, value: v,
        }));
      }

      setStats({
        totalStudents: studentCount || 0,
        totalTeachers: teacherCount || 0,
        totalQuizzes: 0,
        avgScore,
        classDistribution: stats.classDistribution,
        subjectPerformance,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/school')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> School Dashboard
        </Button>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> School Analytics
          </h1>
          <p className="text-muted-foreground text-sm">Performance insights across your school</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Students', value: stats.totalStudents, icon: GraduationCap, color: 'text-blue-600' },
            { label: 'Teachers', value: stats.totalTeachers, icon: Users, color: 'text-green-600' },
            { label: 'Avg. Score', value: `${stats.avgScore}%`, icon: TrendingUp, color: 'text-amber-600' },
            { label: 'Top Performing', value: stats.subjectPerformance[0]?.name || '-', icon: Award, color: 'text-purple-600' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-4 text-center">
                <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subject Performance */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Subject Performance</CardTitle></CardHeader>
            <CardContent>
              {stats.subjectPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.subjectPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">No performance data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Class Distribution */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Student Distribution by Class</CardTitle></CardHeader>
            <CardContent>
              {stats.classDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={stats.classDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                      {stats.classDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">No student data yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
