import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ClassStudentsManager } from '@/components/teacher/ClassStudentsManager';
import { ArrowLeft, Users, TrendingUp, Search, UserMinus, Star, FileDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';

interface PerformanceRecord {
  student_id: string;
  subject: string;
  score: number;
  created_at: string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 67%, 54%)',
  'hsl(199, 89%, 48%)',
  'hsl(0, 84%, 60%)',
  'hsl(45, 93%, 47%)',
];

const subjectLabels: Record<string, string> = {
  mathematics: 'Mathematics', english: 'English', science: 'Science',
  social_studies: 'Social Studies', yoruba: 'Yoruba', hausa: 'Hausa',
  igbo: 'Igbo', french: 'French', basic_science: 'Basic Science',
  basic_technology: 'Basic Technology', home_economics: 'Home Economics',
  civic_education: 'Civic Education', agriculture: 'Agriculture',
  business_studies: 'Business Studies', physics: 'Physics', chemistry: 'Chemistry',
  biology: 'Biology', economics: 'Economics', geography: 'Geography',
  literature: 'Literature', government: 'Government', crk: 'CRK', irk: 'IRK',
};

interface ClassData {
  id: string;
  name: string;
  class_level: string;
  section: string | null;
  subject: string | null;
  academic_year: string;
  description: string | null;
  is_active: boolean;
}

interface ClassStudent {
  id: string;
  student_id: string;
  is_active: boolean;
  joined_at: string;
  profile?: {
    full_name: string;
    student_id: string | null;
    avatar_url: string | null;
    class_level: string | null;
  };
  avg_score?: number;
}

const classLevelLabels: Record<string, string> = {
  primary_1: 'Primary 1', primary_2: 'Primary 2', primary_3: 'Primary 3',
  primary_4: 'Primary 4', primary_5: 'Primary 5', primary_6: 'Primary 6',
  jss_1: 'JSS 1', jss_2: 'JSS 2', jss_3: 'JSS 3',
  ss_1: 'SS 1', ss_2: 'SS 2', ss_3: 'SS 3',
};

const TeacherClassDetail = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [perfRecords, setPerfRecords] = useState<PerformanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (classId) {
      loadClassData();
      loadClassStudents();
    }
  }, [classId]);

  const loadClassData = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_classes' as any)
        .select('*')
        .eq('id', classId!)
        .single();

      if (error) throw error;
      setClassData(data as any);
    } catch (error) {
      console.error('Error loading class:', error);
      toast({ title: 'Error', description: 'Failed to load class data.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadClassStudents = async () => {
    try {
      // Get class student records
      const { data: classStudents, error } = await supabase
        .from('teacher_class_students' as any)
        .select('*')
        .eq('class_id', classId!)
        .eq('is_active', true);

      if (error) throw error;

      if (!classStudents || classStudents.length === 0) {
        setStudents([]);
        return;
      }

      // Get profiles for these students
      const studentIds = (classStudents as any[]).map((cs: any) => cs.student_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, student_id, avatar_url, class_level')
        .in('user_id', studentIds);

      // Get performance data (with subject and date for charts)
      const { data: perfData } = await supabase
        .from('performance')
        .select('student_id, score, subject, created_at')
        .in('student_id', studentIds);

      // Store full performance records for charts
      setPerfRecords((perfData || []) as PerformanceRecord[]);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const perfMap = new Map<string, number[]>();
      (perfData || []).forEach(p => {
        if (!perfMap.has(p.student_id)) perfMap.set(p.student_id, []);
        perfMap.get(p.student_id)!.push(p.score);
      });

      const enrichedStudents = (classStudents as any[]).map((cs: any) => {
        const profile = profileMap.get(cs.student_id);
        const scores = perfMap.get(cs.student_id) || [];
        const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        return { ...cs, profile, avg_score: avg };
      });

      setStudents(enrichedStudents);
    } catch (error) {
      console.error('Error loading class students:', error);
    }
  };

  const removeStudent = async (membershipId: string) => {
    try {
      const { error } = await supabase
        .from('teacher_class_students' as any)
        .update({ is_active: false } as any)
        .eq('id', membershipId);

      if (error) throw error;
      toast({ title: 'Removed', description: 'Student removed from class.' });
      loadClassStudents();
    } catch (error: any) {
      console.error('Error removing student:', error);
      toast({ title: 'Error', description: 'Failed to remove student.', variant: 'destructive' });
    }
  };

  const toggleArchive = async () => {
    if (!classData) return;
    try {
      const { error } = await supabase
        .from('teacher_classes' as any)
        .update({ is_active: !classData.is_active } as any)
        .eq('id', classData.id);

      if (error) throw error;
      toast({ title: 'Success', description: classData.is_active ? 'Class archived.' : 'Class restored.' });
      loadClassData();
    } catch (error) {
      console.error('Error toggling archive:', error);
    }
  };

  // Chart data: subject-wise average scores
  const subjectChartData = useMemo(() => {
    const subjectMap = new Map<string, number[]>();
    perfRecords.forEach(r => {
      if (!subjectMap.has(r.subject)) subjectMap.set(r.subject, []);
      subjectMap.get(r.subject)!.push(r.score);
    });
    return Array.from(subjectMap.entries())
      .map(([subject, scores]) => ({
        subject: subjectLabels[subject] || subject,
        average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        count: scores.length,
      }))
      .sort((a, b) => b.average - a.average);
  }, [perfRecords]);

  // Chart data: monthly trend
  const trendChartData = useMemo(() => {
    const monthMap = new Map<string, number[]>();
    perfRecords.forEach(r => {
      const month = r.created_at.slice(0, 7); // YYYY-MM
      if (!monthMap.has(month)) monthMap.set(month, []);
      monthMap.get(month)!.push(r.score);
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, scores]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        tests: scores.length,
      }));
  }, [perfRecords]);

  // Chart data: score distribution
  const distributionData = useMemo(() => {
    const buckets = [
      { range: '0-39', min: 0, max: 39, count: 0 },
      { range: '40-49', min: 40, max: 49, count: 0 },
      { range: '50-59', min: 50, max: 59, count: 0 },
      { range: '60-69', min: 60, max: 69, count: 0 },
      { range: '70-79', min: 70, max: 79, count: 0 },
      { range: '80-89', min: 80, max: 89, count: 0 },
      { range: '90-100', min: 90, max: 100, count: 0 },
    ];
    perfRecords.forEach(r => {
      const bucket = buckets.find(b => r.score >= b.min && r.score <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [perfRecords]);

  const filteredStudents = students.filter(s =>
    s.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.profile?.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const classAvg = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.avg_score || 0), 0) / students.length)
    : 0;

  const exportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const sortedStudents = [...students].sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0));
    
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 32px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; margin: 0;">📊 Class Performance Report</h1>
          <h2 style="font-size: 18px; color: #555; margin: 4px 0;">${classData?.name || ''}</h2>
          <p style="color: #888; font-size: 13px;">
            ${classLevelLabels[classData?.class_level || ''] || classData?.class_level}
            ${classData?.section ? ' • Section ' + classData.section : ''}
            • ${classData?.academic_year}
            • Generated ${new Date().toLocaleDateString()}
          </p>
        </div>

        <div style="display: flex; gap: 16px; margin-bottom: 24px;">
          <div style="flex:1; background: #f0f4ff; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin:0; font-size: 13px; color: #555;">Total Students</p>
            <p style="margin:4px 0 0; font-size: 28px; font-weight: bold;">${students.length}</p>
          </div>
          <div style="flex:1; background: #f0fff4; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin:0; font-size: 13px; color: #555;">Class Average</p>
            <p style="margin:4px 0 0; font-size: 28px; font-weight: bold;">${classAvg}%</p>
          </div>
        </div>

        ${subjectChartData.length > 0 ? `
        <h3 style="font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 6px;">Subject-wise Averages</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
          <thead><tr style="background: #f5f5f5;">
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Subject</th>
            <th style="text-align: center; padding: 8px; border: 1px solid #ddd;">Average Score</th>
            <th style="text-align: center; padding: 8px; border: 1px solid #ddd;">Tests Taken</th>
          </tr></thead>
          <tbody>${subjectChartData.map(s => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${s.subject}</td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd; color: ${s.average >= 70 ? '#16a34a' : s.average >= 50 ? '#ca8a04' : '#dc2626'}; font-weight: bold;">${s.average}%</td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${s.count}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : ''}

        <h3 style="font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 6px;">Student Rankings</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead><tr style="background: #f5f5f5;">
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Rank</th>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Student Name</th>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Student ID</th>
            <th style="text-align: center; padding: 8px; border: 1px solid #ddd;">Average Score</th>
          </tr></thead>
          <tbody>${sortedStudents.map((s, i) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">#${i + 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${s.profile?.full_name || 'Unknown'}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${s.profile?.student_id || 'N/A'}</td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd; color: ${(s.avg_score || 0) >= 70 ? '#16a34a' : (s.avg_score || 0) >= 50 ? '#ca8a04' : '#dc2626'}; font-weight: bold;">${s.avg_score || 0}%</td>
            </tr>`).join('')}
          </tbody>
        </table>

        ${distributionData.some(d => d.count > 0) ? `
        <h3 style="font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 6px; margin-top: 24px;">Score Distribution</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead><tr style="background: #f5f5f5;">
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Score Range</th>
            <th style="text-align: center; padding: 8px; border: 1px solid #ddd;">Number of Scores</th>
          </tr></thead>
          <tbody>${distributionData.filter(d => d.count > 0).map(d => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${d.range}%</td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${d.count}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : ''}

        <p style="text-align: center; color: #aaa; font-size: 11px; margin-top: 32px;">EduGenie • Class Performance Report</p>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    await html2pdf().set({
      margin: [10, 10],
      filename: `${classData?.name || 'Class'}_Performance_Report.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(container).save();

    document.body.removeChild(container);
    toast({ title: 'Report exported', description: 'PDF report downloaded successfully.' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading class...</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <Card><CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">Class not found.</p>
          <Button onClick={() => navigate('/teacher')}>Back to Dashboard</Button>
        </CardContent></Card>
      </div>
    );
  }

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
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/teacher')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{classData.name}</h1>
            <p className="text-muted-foreground">
              {classLevelLabels[classData.class_level] || classData.class_level}
              {classData.section && ` • Section ${classData.section}`}
              {' • '}{classData.academic_year}
            </p>
            {classData.description && <p className="text-sm text-muted-foreground mt-1">{classData.description}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPDF} disabled={students.length === 0}>
              <FileDown className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={toggleArchive}>
              {classData.is_active ? 'Archive' : 'Restore'}
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="border-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Total Students</CardTitle></CardHeader>
            <CardContent><p className="text-4xl font-bold text-primary">{students.length}</p></CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-secondary" />Class Average</CardTitle></CardHeader>
            <CardContent><p className="text-4xl font-bold text-secondary">{classAvg}%</p></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <ClassStudentsManager classId={classId!} onStudentsChanged={loadClassStudents} />
            </div>

            {filteredStudents.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                {students.length === 0 ? 'No students yet. Add students to get started!' : 'No matching students found.'}
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <Card key={student.id} className="border">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.profile?.avatar_url || ''} />
                          <AvatarFallback>{student.profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.profile?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{student.profile?.student_id || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={student.avg_score >= 70 ? 'default' : student.avg_score >= 50 ? 'secondary' : 'destructive'}>
                          {student.avg_score}% avg
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => removeStudent(student.id)}>
                          <UserMinus className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            {students.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Add students to see performance analytics.</p>
              </CardContent></Card>
            ) : perfRecords.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No performance data yet for this class.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-6">
                {/* Subject-wise Breakdown */}
                <Card>
                  <CardHeader><CardTitle>Subject-wise Average Scores</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis dataKey="subject" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                            formatter={(value: number) => [`${value}%`, 'Average']}
                          />
                          <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                            {subjectChartData.map((_, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Trend Over Time */}
                  <Card>
                    <CardHeader><CardTitle>Performance Trend</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                              formatter={(value: number, name: string) => [name === 'average' ? `${value}%` : value, name === 'average' ? 'Avg Score' : 'Tests Taken']}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="average" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Avg Score" />
                            <Line type="monotone" dataKey="tests" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ r: 4 }} name="Tests Taken" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Score Distribution */}
                  <Card>
                    <CardHeader><CardTitle>Score Distribution</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={distributionData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            <XAxis dataKey="range" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                            <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                              formatter={(value: number) => [value, 'Students']}
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Student Rankings */}
                <Card>
                  <CardHeader><CardTitle>Student Rankings</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[...students].sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0)).map((student, idx) => (
                        <div key={student.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-muted-foreground w-8">#{idx + 1}</span>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.profile?.avatar_url || ''} />
                              <AvatarFallback>{student.profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{student.profile?.full_name || 'Unknown'}</span>
                          </div>
                          <Badge variant={student.avg_score >= 70 ? 'default' : student.avg_score >= 50 ? 'secondary' : 'destructive'}>
                            {student.avg_score}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TeacherClassDetail;
