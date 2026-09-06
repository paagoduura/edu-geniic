import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, UserPlus, Search, MoreVertical, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function SchoolStaffManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [newRole, setNewRole] = useState('teacher');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const { data: membership } = await supabase
      .from('school_members')
      .select('school_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('school_role', ['admin', 'vice_admin'])
      .maybeSingle();

    if (!membership) { setLoading(false); return; }
    setSchoolId(membership.school_id);

    const { data: members } = await supabase
      .from('school_members')
      .select('*')
      .eq('school_id', membership.school_id)
      .in('school_role', ['admin', 'vice_admin', 'teacher', 'non_teaching_staff'])
      .eq('is_active', true);

    if (members) {
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, school_name')
        .in('user_id', userIds);

      const enriched = members.map(m => ({
        ...m,
        profile: profiles?.find(p => p.user_id === m.user_id),
      }));
      setStaff(enriched);
    }
    setLoading(false);
  };

  const handleAddStaff = async () => {
    if (!schoolId || !studentId.trim()) return;
    setAdding(true);
    try {
      // Find user by student ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('student_id', studentId.trim())
        .maybeSingle();

      if (!profile) {
        toast({ title: "Not found", description: "No user found with that ID.", variant: "destructive" });
        setAdding(false);
        return;
      }

      const { error } = await supabase.from('school_members').insert({
        school_id: schoolId,
        user_id: profile.user_id,
        school_role: newRole,
        department: department || null,
        position: position || null,
      });

      if (error) {
        if (error.message.includes('duplicate')) {
          toast({ title: "Already exists", description: "This user is already a member.", variant: "destructive" });
        } else throw error;
      } else {
        toast({ title: "Staff added", description: `${profile.full_name} added as ${newRole}.` });
        setAddDialogOpen(false);
        setStudentId('');
        setDepartment('');
        setPosition('');
        fetchData();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    await supabase.from('school_members').update({ is_active: false }).eq('id', memberId);
    toast({ title: "Removed" });
    fetchData();
  };

  const filtered = staff.filter(s =>
    s.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.school_role.includes(search.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    vice_admin: 'bg-orange-100 text-orange-700',
    teacher: 'bg-blue-100 text-blue-700',
    non_teaching_staff: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/school')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> School Dashboard
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="w-4 h-4" /> Add Staff</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">User ID (STU-XXXXX)</label>
                  <Input placeholder="STU-12345" value={studentId} onChange={e => setStudentId(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="vice_admin">Vice Admin</SelectItem>
                      <SelectItem value="non_teaching_staff">Non-Teaching Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Department</label>
                  <Input placeholder="e.g. Science" value={department} onChange={e => setDepartment(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Position</label>
                  <Input placeholder="e.g. Head of Science" value={position} onChange={e => setPosition(e.target.value)} />
                </div>
                <Button onClick={handleAddStaff} disabled={adding} className="w-full">
                  {adding ? 'Adding...' : 'Add Staff Member'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Staff Management
          </h1>
          <p className="text-muted-foreground text-sm">Manage teachers and non-teaching staff</p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input placeholder="Search staff..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No staff members found. Add your first staff member.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(member => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.profile?.full_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[member.school_role] || ''}`}>
                          {member.school_role.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.department || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{member.position || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemove(member.id)}>
                          Remove
                        </Button>
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
