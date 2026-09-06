import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Megaphone, MessageSquare, Plus, Send, Pin, Loader2, Users, Mail, MailOpen, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function TeacherCommunication() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState('');

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTargetType, setAnnTargetType] = useState('all');
  const [annTargetClassId, setAnnTargetClassId] = useState('');
  const [annIsPinned, setAnnIsPinned] = useState(false);
  const [isCreatingAnn, setIsCreatingAnn] = useState(false);

  // Message form
  const [msgRecipientId, setMsgRecipientId] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (user) {
      loadAll();
      setupRealtimeMessages();
    }
  }, [user]);

  const setupRealtimeMessages = () => {
    const channel = supabase
      .channel('teacher-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
      }, () => {
        loadMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([loadAnnouncements(), loadMessages(), loadClasses(), loadContacts()]);
    setIsLoading(false);
  };

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*, teacher_classes:target_class_id (name, section)')
        .eq('teacher_id', user?.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (e: any) {
      console.error('Error loading announcements:', e);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setMessages(data || []);
    } catch (e: any) {
      console.error('Error loading messages:', e);
    }
  };

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_classes')
        .select('id, name, section, class_level')
        .eq('teacher_id', user?.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setTeacherClasses(data || []);
    } catch (e: any) {
      console.error('Error loading classes:', e);
    }
  };

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, student_id, class_level')
        .order('full_name');
      if (error) throw error;
      setContacts((data || []).filter(c => c.user_id !== user?.id));
    } catch (e: any) {
      console.error('Error loading contacts:', e);
    }
  };

  const createAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) {
      toast({ title: "Missing fields", description: "Title and content are required.", variant: "destructive" });
      return;
    }
    setIsCreatingAnn(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        teacher_id: user?.id,
        title: annTitle.trim(),
        content: annContent.trim(),
        target_type: annTargetType,
        target_class_id: annTargetType === 'class' && annTargetClassId ? annTargetClassId : null,
        target_class_level: annTargetType === 'class_level' && annTargetClassId ? annTargetClassId : null,
        is_pinned: annIsPinned,
      });
      if (error) throw error;
      toast({ title: "Announcement posted!", description: "Your announcement has been published." });
      setAnnTitle(''); setAnnContent(''); setAnnTargetType('all'); setAnnTargetClassId(''); setAnnIsPinned(false);
      setShowAnnouncementDialog(false);
      loadAnnouncements();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to create announcement.", variant: "destructive" });
    } finally {
      setIsCreatingAnn(false);
    }
  };

  const sendMessage = async () => {
    if (!msgContent.trim() || !msgRecipientId) {
      toast({ title: "Missing fields", description: "Select a recipient and write a message.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const { error } = await supabase.from('direct_messages').insert({
        sender_id: user?.id,
        recipient_id: msgRecipientId,
        content: msgContent.trim(),
      });
      if (error) throw error;
      setMsgContent('');
      loadMessages();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to send message.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase.from('direct_messages').update({ is_read: true }).eq('id', messageId);
  };

  // Group messages into conversations
  const conversations = messages.reduce((acc: Record<string, any[]>, msg) => {
    const partnerId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
    if (!acc[partnerId]) acc[partnerId] = [];
    acc[partnerId].push(msg);
    return acc;
  }, {});

  const conversationPartners = Object.keys(conversations).map(partnerId => {
    const msgs = conversations[partnerId];
    const lastMsg = msgs[0];
    const unreadCount = msgs.filter((m: any) => m.recipient_id === user?.id && !m.is_read).length;
    const contact = contacts.find(c => c.user_id === partnerId);
    return { partnerId, lastMsg, unreadCount, contact };
  }).sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime());

  const selectedMessages = selectedConversation
    ? (conversations[selectedConversation] || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : [];

  const selectedContact = selectedConversation ? contacts.find(c => c.user_id === selectedConversation) : null;

  const filteredContacts = contacts.filter(c =>
    c.full_name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.student_id?.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const unreadTotal = messages.filter(m => m.recipient_id === user?.id && !m.is_read).length;

  const classLevels = [
    'primary_1','primary_2','primary_3','primary_4','primary_5','primary_6',
    'jss_1','jss_2','jss_3','ss_1','ss_2','ss_3'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/teacher')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Megaphone className="w-4 h-4 mr-2" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Announcement</DialogTitle>
                  <DialogDescription>Broadcast a message to students and parents</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input placeholder="Announcement title" value={annTitle} onChange={e => setAnnTitle(e.target.value)} maxLength={200} />
                  </div>
                  <div className="space-y-2">
                    <Label>Content *</Label>
                    <Textarea placeholder="Write your announcement..." value={annContent} onChange={e => setAnnContent(e.target.value)} className="min-h-[120px]" maxLength={2000} />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select value={annTargetType} onValueChange={(v) => { setAnnTargetType(v); setAnnTargetClassId(''); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Students</SelectItem>
                        <SelectItem value="class">Specific Class</SelectItem>
                        <SelectItem value="class_level">Class Level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {annTargetType === 'class' && (
                    <div className="space-y-2">
                      <Label>Select Class</Label>
                      <Select value={annTargetClassId} onValueChange={setAnnTargetClassId}>
                        <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
                        <SelectContent>
                          {teacherClasses.map(tc => (
                            <SelectItem key={tc.id} value={tc.id}>{tc.name}{tc.section ? ` - ${tc.section}` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {annTargetType === 'class_level' && (
                    <div className="space-y-2">
                      <Label>Select Class Level</Label>
                      <Select value={annTargetClassId} onValueChange={setAnnTargetClassId}>
                        <SelectTrigger><SelectValue placeholder="Choose level" /></SelectTrigger>
                        <SelectContent>
                          {classLevels.map(cl => (
                            <SelectItem key={cl} value={cl}>{cl.replace('_', ' ').toUpperCase()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="pinned" checked={annIsPinned} onChange={e => setAnnIsPinned(e.target.checked)} className="rounded" />
                    <Label htmlFor="pinned" className="cursor-pointer">Pin this announcement</Label>
                  </div>
                  <Button onClick={createAnnouncement} disabled={isCreatingAnn} className="w-full">
                    {isCreatingAnn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Megaphone className="w-4 h-4 mr-2" />}
                    Post Announcement
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Communication Hub</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Communication Hub</h1>
          <p className="text-muted-foreground text-lg">Send announcements and messages to students and parents</p>
        </div>

        <Tabs defaultValue="announcements" className="space-y-6">
          <TabsList>
            <TabsTrigger value="announcements">
              <Megaphone className="w-4 h-4 mr-1" />
              Announcements ({announcements.length})
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="w-4 h-4 mr-1" />
              Messages
              {unreadTotal > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] text-xs">{unreadTotal}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="announcements">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : announcements.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No announcements yet</h3>
                  <p className="text-muted-foreground mb-4">Post your first announcement to reach students and parents.</p>
                  <Button onClick={() => setShowAnnouncementDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Create Announcement
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {announcements.map(ann => (
                  <Card key={ann.id} className={ann.is_pinned ? 'border-primary/50 bg-primary/5' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {ann.is_pinned && <Pin className="w-4 h-4 text-primary" />}
                          <CardTitle className="text-lg">{ann.title}</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={ann.target_type === 'all' ? 'default' : 'secondary'}>
                            {ann.target_type === 'all' ? 'All Students' :
                             ann.target_type === 'class' ? (ann.teacher_classes?.name || 'Specific Class') :
                             ann.target_class_level?.replace('_', ' ').toUpperCase() || 'Class Level'}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>{format(new Date(ann.created_at), 'PPp')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{ann.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages">
            <div className="grid md:grid-cols-3 gap-4 h-[600px]">
              {/* Conversation list */}
              <Card className="md:col-span-1 flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Conversations</CardTitle>
                    <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline"><Plus className="w-4 h-4" /></Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>New Message</DialogTitle>
                          <DialogDescription>Start a conversation with a student or parent</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>Search Contact</Label>
                            <Input placeholder="Search by name or ID..." value={contactSearch} onChange={e => setContactSearch(e.target.value)} />
                          </div>
                          <ScrollArea className="h-[200px] border rounded-md p-2">
                            {filteredContacts.slice(0, 20).map(c => (
                              <button
                                key={c.user_id}
                                className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-left ${msgRecipientId === c.user_id ? 'bg-primary/10' : ''}`}
                                onClick={() => setMsgRecipientId(c.user_id)}
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={c.avatar_url || ''} />
                                  <AvatarFallback className="text-xs">{c.full_name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{c.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{c.student_id || 'No ID'}</p>
                                </div>
                              </button>
                            ))}
                          </ScrollArea>
                          <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea placeholder="Write your message..." value={msgContent} onChange={e => setMsgContent(e.target.value)} maxLength={2000} />
                          </div>
                          <Button onClick={() => { sendMessage().then(() => { setShowMessageDialog(false); setMsgRecipientId(''); setContactSearch(''); }); }} disabled={isSending || !msgRecipientId || !msgContent.trim()} className="w-full">
                            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Send Message
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full">
                    {conversationPartners.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 px-4 text-sm">No conversations yet</p>
                    ) : (
                      conversationPartners.map(({ partnerId, lastMsg, unreadCount, contact }) => (
                        <button
                          key={partnerId}
                          className={`w-full flex items-center gap-3 p-3 border-b hover:bg-muted/50 transition-colors text-left ${selectedConversation === partnerId ? 'bg-muted' : ''}`}
                          onClick={() => {
                            setSelectedConversation(partnerId);
                            // Mark unread messages as read
                            conversations[partnerId]
                              .filter((m: any) => m.recipient_id === user?.id && !m.is_read)
                              .forEach((m: any) => markAsRead(m.id));
                          }}
                        >
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={contact?.avatar_url || ''} />
                            <AvatarFallback>{contact?.full_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate">{contact?.full_name || 'Unknown'}</p>
                              {unreadCount > 0 && (
                                <Badge variant="destructive" className="h-5 min-w-[20px] text-xs">{unreadCount}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{lastMsg.content}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(lastMsg.created_at), 'PP')}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Message thread */}
              <Card className="md:col-span-2 flex flex-col">
                {selectedConversation ? (
                  <>
                    <CardHeader className="pb-2 border-b">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedContact?.avatar_url || ''} />
                          <AvatarFallback>{selectedContact?.full_name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{selectedContact?.full_name || 'Unknown'}</CardTitle>
                          <CardDescription>{selectedContact?.student_id || ''}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0">
                      <ScrollArea className="h-[420px] p-4">
                        <div className="space-y-3">
                          {selectedMessages.map((msg: any) => {
                            const isMine = msg.sender_id === user?.id;
                            return (
                              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                  <p className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                    {format(new Date(msg.created_at), 'p')}
                                    {isMine && (msg.is_read ? ' ✓✓' : ' ✓')}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </CardContent>
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type a message..."
                          value={msgContent}
                          onChange={e => setMsgContent(e.target.value)}
                          maxLength={2000}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (msgContent.trim()) {
                                setMsgRecipientId(selectedConversation);
                                sendMessage();
                              }
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          disabled={isSending || !msgContent.trim()}
                          onClick={() => {
                            setMsgRecipientId(selectedConversation);
                            sendMessage();
                          }}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                      <p className="text-muted-foreground text-sm">Choose a conversation or start a new one</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
