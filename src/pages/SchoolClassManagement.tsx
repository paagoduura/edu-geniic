import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, BookOpen, Clock, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const daysOfWeek = [
  { value: '1', label: 'Monday' }, { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' }, { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
];

const dayLabels: Record<number, string> = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' };

export default function SchoolClassManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ subject: '', day_of_week: '1', start_time: '08:00', end_time: '09:00', room: '' });
  const [selectedDay, setSelectedDay] = useState('1');

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const { data: membership } = await supabase.from('school_members').select('school_id')
      .eq('user_id', user.id).eq('is_active', true).in('school_role', ['admin', 'vice_admin']).maybeSingle();
    if (!membership) { setLoading(false); return; }
    setSchoolId(membership.school_id);

    const { data } = await supabase.from('school_timetable').select('*')
      .eq('school_id', membership.school_id).order('day_of_week').order('start_time');
    setTimetable(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!schoolId) return;
    setAdding(true);
    try {
      const { error } = await supabase.from('school_timetable').insert([{
        school_id: schoolId,
        subject: form.subject,
        day_of_week: parseInt(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        room: form.room || null,
      }]);
      if (error) throw error;
      toast({ title: "Added to timetable" });
      setAddOpen(false);
      setForm({ subject: '', day_of_week: '1', start_time: '08:00', end_time: '09:00', room: '' });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('school_timetable').delete().eq('id', id);
    toast({ title: "Removed" }); fetchData();
  };

  const filteredTimetable = timetable.filter(t => t.day_of_week === parseInt(selectedDay));

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/school')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> School Dashboard
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Add Period</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Timetable Period</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div><label className="text-sm font-medium">Subject</label>
                  <Input placeholder="e.g. Mathematics" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Day</label>
                  <Select value={form.day_of_week} onValueChange={v => setForm({ ...form, day_of_week: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{daysOfWeek.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium">Start Time</label>
                    <Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
                  <div><label className="text-sm font-medium">End Time</label>
                    <Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
                </div>
                <div><label className="text-sm font-medium">Room</label>
                  <Input placeholder="e.g. Room 201" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} /></div>
                <Button onClick={handleAdd} disabled={adding || !form.subject} className="w-full">{adding ? 'Adding...' : 'Add Period'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Class & Timetable Management
          </h1>
          <p className="text-muted-foreground text-sm">Manage school timetable and class schedules</p>
        </div>

        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {daysOfWeek.map(d => (
            <Button key={d.value} variant={selectedDay === d.value ? 'default' : 'outline'} size="sm"
              onClick={() => setSelectedDay(d.value)}>{d.label}</Button>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" /> {dayLabels[parseInt(selectedDay)]} Schedule
          </CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filteredTimetable.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No periods scheduled for this day.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTimetable.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {t.start_time?.slice(0, 5)} - {t.end_time?.slice(0, 5)}
                      </TableCell>
                      <TableCell>{t.subject}</TableCell>
                      <TableCell className="text-muted-foreground">{t.room || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(t.id)}>Remove</Button>
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
