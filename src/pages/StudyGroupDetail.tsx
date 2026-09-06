import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FileText, Plus, Users, ClipboardList } from 'lucide-react';

const StudyGroupDetail = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '' });

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
      setupRealtimeSubscription();
    }
  }, [groupId]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_notes',
          filter: `group_id=eq.${groupId}`,
        },
        () => fetchNotes()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_group_members',
          filter: `group_id=eq.${groupId}`,
        },
        () => fetchMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchGroupData = async () => {
    await Promise.all([
      fetchGroup(),
      fetchMembers(),
      fetchNotes(),
      fetchQuizzes(),
    ]);
  };

  const fetchGroup = async () => {
    const { data, error } = await supabase
      .from('study_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) {
      console.error('Error fetching group:', error);
      return;
    }
    setGroup(data);
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('study_group_members')
      .select(`
        *,
        profiles:student_id (
          full_name,
          avatar_url
        )
      `)
      .eq('group_id', groupId);

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }
    setMembers(data || []);
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('shared_notes')
      .select(`
        *,
        creator:created_by (full_name)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }
    setNotes(data || []);
  };

  const fetchQuizzes = async () => {
    const { data, error } = await supabase
      .from('group_quizzes')
      .select(`
        *,
        creator:created_by (full_name)
      `)
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quizzes:', error);
      return;
    }
    setQuizzes(data || []);
  };

  const createNote = async () => {
    if (!user || !groupId) return;

    try {
      const { error } = await supabase
        .from('shared_notes')
        .insert({
          group_id: groupId,
          title: newNote.title,
          content: newNote.content,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Note created successfully!',
      });

      setIsNoteDialogOpen(false);
      setNewNote({ title: '', content: '' });
      fetchNotes();
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: 'Error',
        description: 'Failed to create note',
        variant: 'destructive',
      });
    }
  };

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/study-groups')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{group.name}</h1>
            <p className="text-muted-foreground">{group.description}</p>
          </div>
        </div>

        <Tabs defaultValue="notes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notes" className="gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Quizzes
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Note
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Shared Note</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newNote.title}
                        onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                        placeholder="Note title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={newNote.content}
                        onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                        placeholder="Write your notes here..."
                        rows={8}
                      />
                    </div>
                    <Button onClick={createNote} className="w-full">
                      Create Note
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {notes.map((note) => (
                <Card key={note.id}>
                  <CardHeader>
                    <CardTitle>{note.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      By {note.creator?.full_name} • {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{note.content}</p>
                  </CardContent>
                </Card>
              ))}
              {notes.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No notes yet. Create the first one!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-4">
            <div className="grid gap-4">
              {quizzes.map((quiz) => (
                <Card key={quiz.id}>
                  <CardHeader>
                    <CardTitle>{quiz.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      By {quiz.creator?.full_name} • {new Date(quiz.created_at).toLocaleDateString()}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">{quiz.description}</p>
                    <Button>Take Quiz</Button>
                  </CardContent>
                </Card>
              ))}
              {quizzes.length === 0 && (
                <div className="text-center py-12">
                  <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No quizzes available yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{member.profiles?.full_name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudyGroupDetail;