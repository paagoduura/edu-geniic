import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, UserPlus, Search, GraduationCap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function SchoolStudentManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const { data: membership } = await supabase
      .from('school_members').select('school_id')
      .eq('user_id', user.id).eq('is_active', true)
      .in('school_role', ['admin', 'vice_admin']).maybeSingle();

    if (!membership) { setLoading(false); return; }
    setSchoolId(membership.school_id);

    const { data: members } = await supabase
      .from('school_members').select('*')
      .eq('school_id', membership.school_id)
      .eq('school_role', 'student').eq('is_active', true);

    if (members) {
      const userIds = members.map(m => m.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles').select('user_id, full_name, avatar_url, class_level, student_id, school_name')
          .in('user_id', userIds);
        setStudents(members.map(m => ({
          ...m, profile: profiles?.find(p => p.user_id === m.user_id)
        })));
      }
    }
    setLoading(false);
  };

  const handleAddStudent = async () => {
    if (!schoolId || !studentIdInput.trim()) return;
    setAdding(true);
    try {
      const { data: profile } = await supabase
        .from('profiles').select('user_id, full_name')
        .eq('student_id', studentIdInput.trim()).maybeSingle();

      if (!profile) {
        toast({ title: "Not found", description: "No user with that Student ID.", variant: "destructive" });
        setAdding(false); return;
      }

      const { error } = await supabase.from('school_members').insert({
        school_id: schoolId, user_id: profile.user_id, school_role: 'student',
      });

      if (error) {
        if (error.message.includes('duplicate'))
          toast({ title: "Already enrolled", variant: "destructive" });
        else throw error;
      } else {
        toast({ title: "Student added", description: `${profile.full_name} enrolled.` });
        setAddDialogOpen(false); setStudentIdInput(''); fetchData();
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setAdding(false); }
  };

  const handleRemove = async (id: string) => {
    await supabase.from('school_members').update({ is_active: false }).eq('id', id);
    toast({ title: "Student removed" }); fetchData();
  };

  const classLevelLabels: Record<string, string> = {
    primary_1: 'Primary 1', primary_2: 'Primary 2', primary_3: 'Primary 3',
    primary_4: 'Primary 4', primary_5: 'Primary 5', primary_6: 'Primary 6',
    jss_1: 'JSS 1', jss_2: 'JSS 2', jss_3: 'JSS 3',
    ss_1: 'SS 1', ss_2: 'SS 2', ss_3: 'SS 3',
  };

  const filtered = students.filter(s =>
    s.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.profile?.student_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/school')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> School Dashboard
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="w-4 h-4" /> Enroll Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Enroll Student</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Student ID</label>
                  <Input placeholder="STU-12345" value={studentIdInput} onChange={e => setStudentIdInput(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">Enter the student's EduGenie ID</p>
                </div>
                <Button onClick={handleAddStudent} disabled={adding} className="w-full">
                  {adding ? 'Enrolling...' : 'Enroll Student'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" /> Student Management
          </h1>
          <p className="text-muted-foreground text-sm">Manage student enrollment for your school</p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input placeholder="Search students..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No students enrolled yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.profile?.full_name || 'Unknown'}</TableCell>
                      <TableCell className="text-muted-foreground">{s.profile?.student_id || '-'}</TableCell>
                      <TableCell>{s.profile?.class_level ? classLevelLabels[s.profile.class_level] || s.profile.class_level : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemove(s.id)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
