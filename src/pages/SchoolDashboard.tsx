import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SCHOOL_ACADEMIC_STAFF_ROLES, SCHOOL_ADMIN_ROLES, SCHOOL_INSTRUCTOR_ROLES } from '@/lib/authorization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, School, Users, BookOpen, Calendar, BarChart3, Settings,
  UserPlus, GraduationCap, ClipboardList, Building2, Shield
} from 'lucide-react';

export default function SchoolDashboard() {
  const navigate = useNavigate();
  const { user, hasAnySchoolRole } = useAuth();
  const [school, setSchool] = useState<any>(null);
  const [stats, setStats] = useState({ members: 0, teachers: 0, students: 0, classes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchSchoolData();
  }, [user]);

  const fetchSchoolData = async () => {
    if (!user) return;
    try {
      const { data: membership } = await supabase
        .from('school_members')
        .select('school_id, school_role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .in('school_role', SCHOOL_ADMIN_ROLES)
        .maybeSingle();

      if (!membership) {
        setLoading(false);
        return;
      }

      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', membership.school_id)
        .single();

      setSchool(schoolData);

      const { count: memberCount } = await supabase
        .from('school_members')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', membership.school_id)
        .eq('is_active', true);

      const { count: teacherCount } = await supabase
        .from('school_members')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', membership.school_id)
        .eq('school_role', 'teacher')
        .eq('is_active', true);

      const { count: studentCount } = await supabase
        .from('school_members')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', membership.school_id)
        .eq('school_role', 'student')
        .eq('is_active', true);

      setStats({
        members: memberCount || 0,
        teachers: teacherCount || 0,
        students: studentCount || 0,
        classes: 0,
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <School className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold">No School Found</h2>
            <p className="text-muted-foreground text-sm">You haven't registered a school yet.</p>
            <Button onClick={() => navigate('/school/register')}>Register Your School</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navCards = [
    { title: 'Staff Management', desc: 'Add and manage teachers & staff', icon: Users, path: '/school/staff', color: 'from-blue-500 to-blue-600', roles: SCHOOL_ADMIN_ROLES },
    { title: 'Student Management', desc: 'Manage student enrollment', icon: GraduationCap, path: '/school/students', color: 'from-green-500 to-green-600', roles: SCHOOL_ADMIN_ROLES },
    { title: 'Class Management', desc: 'Classes, sections & timetable', icon: BookOpen, path: '/school/classes', color: 'from-purple-500 to-purple-600', roles: SCHOOL_ADMIN_ROLES },
    { title: 'Analytics', desc: 'School performance insights', icon: BarChart3, path: '/school/analytics', color: 'from-amber-500 to-amber-600', roles: SCHOOL_ADMIN_ROLES },
    { title: 'Departments', desc: 'Manage departments & HODs', icon: Building2, path: '/school/departments', color: 'from-teal-500 to-teal-600', roles: SCHOOL_ADMIN_ROLES },
    { title: 'Learning Tracks', desc: 'Create academic & practical pathways', icon: BookOpen, path: '/school/learning-tracks', color: 'from-primary to-secondary', roles: SCHOOL_ADMIN_ROLES },
    { title: 'Practical Projects', desc: 'Author evidence-based assessments', icon: ClipboardList, path: '/school/practical-projects', color: 'from-indigo-500 to-indigo-600', roles: SCHOOL_ADMIN_ROLES },
    { title: 'Review Queue', desc: 'Assess learner evidence & competencies', icon: ClipboardList, path: '/school/reviews', color: 'from-rose-500 to-rose-600', roles: SCHOOL_INSTRUCTOR_ROLES },
    { title: 'Competency Library', desc: 'Define measurable skill standards', icon: ClipboardList, path: '/school/competencies', color: 'from-cyan-500 to-cyan-600', roles: SCHOOL_ACADEMIC_STAFF_ROLES },
    { title: 'Competency Mapping', desc: 'Map skills across modules & projects', icon: ClipboardList, path: '/school/competency-mapping', color: 'from-violet-500 to-violet-600', roles: SCHOOL_ACADEMIC_STAFF_ROLES },
    { title: 'Settings & KYC', desc: 'School profile & documents', icon: Settings, path: '/school/settings', color: 'from-gray-500 to-gray-600', roles: SCHOOL_ADMIN_ROLES },
  ].filter((card) => card.roles.some((role) => hasAnySchoolRole([role])));

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Button>
          <Badge variant={school.is_verified ? 'default' : 'secondary'} className="gap-1">
            <Shield className="w-3 h-3" />
            {school.is_verified ? 'Verified' : school.verification_status}
          </Badge>
        </div>

        {/* School header */}
        <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <School className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{school.name}</h1>
              <p className="text-white/80 text-sm">{school.motto || `${school.city}, ${school.state}`}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Members', value: stats.members, icon: Users },
            { label: 'Teachers', value: stats.teachers, icon: ClipboardList },
            { label: 'Students', value: stats.students, icon: GraduationCap },
            { label: 'Classes', value: stats.classes, icon: BookOpen },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {navCards.map((card) => (
            <Card
              key={card.title}
              className="cursor-pointer hover:shadow-md transition-shadow border-border/50"
              onClick={() => navigate(card.path)}
            >
              <CardContent className="pt-6 pb-6 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
