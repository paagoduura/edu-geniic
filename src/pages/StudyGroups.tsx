import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus, BookOpen, ArrowLeft } from 'lucide-react';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  subject: string;
  class_level: string;
  created_by: string;
  max_members: number;
  member_count?: number;
}

const StudyGroups = () => {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    subject: '',
    class_level: '',
    max_members: 10,
  });

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select(`
          *,
          study_group_members(count)
        `)
        .eq('is_active', true);

      if (error) throw error;

      const groupsWithCount = data?.map(group => ({
        ...group,
        member_count: group.study_group_members?.[0]?.count || 0,
      })) || [];

      setGroups(groupsWithCount);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load study groups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('study_groups')
        .insert([{
          name: newGroup.name,
          description: newGroup.description,
          subject: newGroup.subject as any,
          class_level: newGroup.class_level as any,
          max_members: newGroup.max_members,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Study group created successfully!',
      });

      setIsDialogOpen(false);
      setNewGroup({
        name: '',
        description: '',
        subject: '',
        class_level: '',
        max_members: 10,
      });
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create study group',
        variant: 'destructive',
      });
    }
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('study_group_members')
        .insert({
          group_id: groupId,
          student_id: user.id,
          role: 'member',
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Joined study group successfully!',
      });

      navigate(`/study-groups/${groupId}`);
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        title: 'Error',
        description: 'Failed to join study group',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Study Groups</h1>
              <p className="text-muted-foreground">Collaborate and learn together</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Study Group</DialogTitle>
                <DialogDescription>
                  Create a new study group to collaborate with peers
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    placeholder="Math Study Circle"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    placeholder="A group for practicing mathematics..."
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={newGroup.subject} onValueChange={(value) => setNewGroup({ ...newGroup, subject: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                      <SelectItem value="physics">Physics</SelectItem>
                      <SelectItem value="chemistry">Chemistry</SelectItem>
                      <SelectItem value="biology">Biology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="class_level">Class Level</Label>
                  <Select value={newGroup.class_level} onValueChange={(value) => setNewGroup({ ...newGroup, class_level: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jss_1">JSS 1</SelectItem>
                      <SelectItem value="jss_2">JSS 2</SelectItem>
                      <SelectItem value="jss_3">JSS 3</SelectItem>
                      <SelectItem value="ss_1">SS 1</SelectItem>
                      <SelectItem value="ss_2">SS 2</SelectItem>
                      <SelectItem value="ss_3">SS 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="max_members">Max Members</Label>
                  <Input
                    id="max_members"
                    type="number"
                    value={newGroup.max_members}
                    onChange={(e) => setNewGroup({ ...newGroup, max_members: parseInt(e.target.value) })}
                    min="2"
                    max="50"
                  />
                </div>
                <Button onClick={createGroup} className="w-full">
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {group.member_count}/{group.max_members}
                  </span>
                </div>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{group.subject.replace('_', ' ')}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Class: {group.class_level.toUpperCase().replace('_', ' ')}
                  </div>
                  <Button
                    onClick={() => joinGroup(group.id)}
                    disabled={group.member_count >= group.max_members}
                    className="w-full"
                  >
                    {group.member_count >= group.max_members ? 'Full' : 'Join Group'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {groups.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No study groups yet</h3>
            <p className="text-muted-foreground mb-4">Create the first study group to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyGroups;