import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, UserMinus, UserPlus } from 'lucide-react';

interface ClassStudentsManagerProps {
  classId: string;
  onStudentsChanged: () => void;
}

interface SearchResult {
  user_id: string;
  full_name: string;
  student_id: string | null;
  avatar_url: string | null;
  class_level: string | null;
}

export const ClassStudentsManager = ({ classId, onStudentsChanged }: ClassStudentsManagerProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [bulkIds, setBulkIds] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const searchStudents = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, student_id, avatar_url, class_level')
        .or(`full_name.ilike.%${searchTerm}%,student_id.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching students:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const addStudent = async (studentUserId: string) => {
    setIsAdding(true);
    try {
      const { error } = await supabase.from('teacher_class_students' as any).insert({
        class_id: classId,
        student_id: studentUserId,
      } as any);

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Info', description: 'Student is already in this class.' });
        } else throw error;
      } else {
        toast({ title: 'Added', description: 'Student added to class.' });
        onStudentsChanged();
      }
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast({ title: 'Error', description: error.message || 'Failed to add student.', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const bulkAddStudents = async () => {
    const ids = bulkIds.split(',').map(id => id.trim()).filter(Boolean);
    if (ids.length === 0) return;
    setIsAdding(true);

    try {
      // Look up user_ids by student_id
      const { data: profiles, error: lookupError } = await supabase
        .from('profiles')
        .select('user_id, student_id')
        .in('student_id', ids);

      if (lookupError) throw lookupError;

      if (!profiles || profiles.length === 0) {
        toast({ title: 'Not found', description: 'No students found with those IDs.', variant: 'destructive' });
        return;
      }

      const inserts = profiles.map(p => ({ class_id: classId, student_id: p.user_id }));
      const { error } = await supabase.from('teacher_class_students' as any).insert(inserts as any);

      if (error) throw error;
      toast({ title: 'Success', description: `Added ${profiles.length} student(s) to class.` });
      setBulkIds('');
      onStudentsChanged();
    } catch (error: any) {
      console.error('Error bulk adding:', error);
      toast({ title: 'Error', description: error.message || 'Failed to add students.', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Students
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Students to Class</DialogTitle>
          <DialogDescription>Search by name or Student ID, or bulk add using comma-separated IDs</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          {/* Search */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or STU-XXXXX..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchStudents()}
              />
              <Button variant="outline" onClick={searchStudents} disabled={isSearching}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map((student) => (
                  <div key={student.user_id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.avatar_url || ''} />
                        <AvatarFallback>{student.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{student.full_name}</p>
                        <p className="text-xs text-muted-foreground">{student.student_id}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => addStudent(student.user_id)} disabled={isAdding}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bulk Add */}
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Bulk Add by Student IDs</p>
            <Input
              placeholder="STU-12345, STU-23456, STU-34567"
              value={bulkIds}
              onChange={(e) => setBulkIds(e.target.value)}
            />
            <Button variant="outline" onClick={bulkAddStudents} disabled={isAdding || !bulkIds.trim()} className="w-full">
              {isAdding ? 'Adding...' : 'Add All'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
