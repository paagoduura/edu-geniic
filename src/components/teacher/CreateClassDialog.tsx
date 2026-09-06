import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus } from 'lucide-react';
import { Constants } from '@/integrations/supabase/types';
import type { Database } from '@/integrations/supabase/types';

type ClassLevel = Database['public']['Enums']['class_level'];
type SubjectType = Database['public']['Enums']['subject_type'];

interface CreateClassDialogProps {
  onClassCreated: () => void;
}

const classLevelLabels: Record<string, string> = {
  primary_1: 'Primary 1', primary_2: 'Primary 2', primary_3: 'Primary 3',
  primary_4: 'Primary 4', primary_5: 'Primary 5', primary_6: 'Primary 6',
  jss_1: 'JSS 1', jss_2: 'JSS 2', jss_3: 'JSS 3',
  ss_1: 'SS 1', ss_2: 'SS 2', ss_3: 'SS 3',
};

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

export const CreateClassDialog = ({ onClassCreated }: CreateClassDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [classLevel, setClassLevel] = useState<ClassLevel | ''>('');
  const [section, setSection] = useState('');
  const [subject, setSubject] = useState<SubjectType | ''>('');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCreate = async () => {
    if (!name || !classLevel || !user) {
      toast({ title: 'Error', description: 'Please fill in class name and level.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.from('teacher_classes' as any).insert({
        teacher_id: user.id,
        name,
        class_level: classLevel,
        section: section || null,
        subject: subject || null,
        academic_year: academicYear,
        description: description || null,
      } as any);

      if (error) throw error;
      toast({ title: 'Success', description: `Class "${name}" created!` });
      setOpen(false);
      resetForm();
      onClassCreated();
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create class.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName(''); setClassLevel(''); setSection(''); setSubject(''); setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Class
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
          <DialogDescription>Set up a new class/section for your students</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="className">Class Name *</Label>
            <Input id="className" placeholder="e.g. JSS 2A" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Class Level *</Label>
            <Select value={classLevel} onValueChange={(v) => setClassLevel(v as ClassLevel)}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.class_level.map((level) => (
                  <SelectItem key={level} value={level}>{classLevelLabels[level] || level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="section">Section</Label>
            <Input id="section" placeholder="e.g. A, B, Science, Arts" value={section} onChange={(e) => setSection(e.target.value)} />
          </div>
          <div>
            <Label>Subject (Optional)</Label>
            <Select value={subject} onValueChange={(v) => setSubject(v as SubjectType)}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.subject_type.map((s) => (
                  <SelectItem key={s} value={s}>{subjectLabels[s] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="academicYear">Academic Year</Label>
            <Input id="academicYear" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Optional notes..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={handleCreate} disabled={isLoading} className="w-full">
            {isLoading ? 'Creating...' : 'Create Class'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
