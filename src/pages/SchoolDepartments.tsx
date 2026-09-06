import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Building2, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function SchoolDepartments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const { data: membership } = await supabase.from('school_members').select('school_id')
      .eq('user_id', user.id).eq('is_active', true).in('school_role', ['admin', 'vice_admin']).maybeSingle();
    if (!membership) { setLoading(false); return; }
    setSchoolId(membership.school_id);

    const { data } = await supabase.from('school_departments').select('*').eq('school_id', membership.school_id);
    setDepartments(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!schoolId || !name.trim()) return;
    setAdding(true);
    try {
      const { error } = await supabase.from('school_departments').insert([{
        school_id: schoolId, name: name.trim(), description: desc.trim() || null,
      }]);
      if (error) throw error;
      toast({ title: "Department created" });
      setAddOpen(false); setName(''); setDesc(''); fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('school_departments').delete().eq('id', id);
    toast({ title: "Department removed" }); fetchData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/school')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> School Dashboard
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Add Department</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div><label className="text-sm font-medium">Name</label><Input placeholder="e.g. Sciences" value={name} onChange={e => setName(e.target.value)} /></div>
                <div><label className="text-sm font-medium">Description</label><Input placeholder="Optional description" value={desc} onChange={e => setDesc(e.target.value)} /></div>
                <Button onClick={handleAdd} disabled={adding} className="w-full">{adding ? 'Creating...' : 'Create Department'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" /> Departments
        </h1>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : departments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No departments created yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">{d.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(d.id)}>Delete</Button>
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
