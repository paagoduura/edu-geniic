import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Star, Bell, Megaphone, MessageSquare, Pin, Send, Mail, MailOpen } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  target_type: string;
  created_at: string;
  teacher_name?: string;
  teacher_avatar?: string;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

const StudentNotifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<DirectMessage | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (user) {
      loadAnnouncements();
      loadMessages();
    }
  }, [user]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('student-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const msg = payload.new as any;
        if (msg.recipient_id === user.id) {
          loadMessages();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with teacher names
      const teacherIds = [...new Set((data || []).map(a => a.teacher_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', teacherIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      setAnnouncements((data || []).map(a => ({
        ...a,
        teacher_name: profileMap.get(a.teacher_id)?.full_name || 'Teacher',
        teacher_avatar: profileMap.get(a.teacher_id)?.avatar_url || undefined,
      })));
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const otherUserIds = [...new Set((data || []).map(m =>
        m.sender_id === user!.id ? m.recipient_id : m.sender_id
      ))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', otherUserIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      setMessages((data || []).map(m => ({
        ...m,
        sender_name: profileMap.get(m.sender_id)?.full_name || 'Unknown',
        sender_avatar: profileMap.get(m.sender_id)?.avatar_url || undefined,
      })));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('id', messageId);
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_read: true } : m));
  };

  const sendReply = async () => {
    if (!replyContent.trim() || !selectedMessage || !user) return;
    setIsSending(true);
    try {
      const recipientId = selectedMessage.sender_id === user.id
        ? selectedMessage.recipient_id
        : selectedMessage.sender_id;

      const { error } = await supabase.from('direct_messages').insert({
        sender_id: user.id,
        recipient_id: recipientId,
        content: replyContent.trim(),
        subject: selectedMessage.subject ? `Re: ${selectedMessage.subject.replace(/^Re: /, '')}` : null,
      });

      if (error) throw error;
      toast({ title: 'Reply sent' });
      setReplyContent('');
      loadMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({ title: 'Error', description: 'Failed to send reply.', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const unreadCount = messages.filter(m => !m.is_read && m.recipient_id === user?.id).length;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              EduGenie
            </span>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="rounded-full">{unreadCount} new</Badge>
          )}
        </div>

        <Tabs defaultValue="announcements">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
              {unreadCount > 0 && (
                <Badge variant="destructive" className="rounded-full text-xs h-5 w-5 p-0 flex items-center justify-center">{unreadCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="announcements" className="mt-6">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-12">Loading...</p>
            ) : announcements.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">No announcements yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {announcements.map(a => (
                  <Card key={a.id} className={a.is_pinned ? 'border-primary/30 bg-primary/5' : ''}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <Avatar className="h-9 w-9 mt-0.5">
                            <AvatarImage src={a.teacher_avatar || ''} />
                            <AvatarFallback>{a.teacher_name?.charAt(0) || 'T'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {a.is_pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                              <h3 className="font-semibold">{a.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{a.teacher_name}</span>
                              <span>•</span>
                              <span>{formatDate(a.created_at)}</span>
                              <Badge variant="outline" className="text-xs capitalize">{a.target_type}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            {messages.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">No messages yet.</p>
                </CardContent>
              </Card>
            ) : selectedMessage ? (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to messages
                </Button>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedMessage.sender_avatar || ''} />
                        <AvatarFallback>{selectedMessage.sender_name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{selectedMessage.subject || 'No Subject'}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {selectedMessage.sender_id === user?.id ? 'You' : selectedMessage.sender_name} • {formatDate(selectedMessage.created_at)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap mb-6">{selectedMessage.content}</p>

                    {/* Show thread */}
                    {messages
                      .filter(m =>
                        m.id !== selectedMessage.id &&
                        ((m.sender_id === selectedMessage.sender_id && m.recipient_id === selectedMessage.recipient_id) ||
                         (m.sender_id === selectedMessage.recipient_id && m.recipient_id === selectedMessage.sender_id))
                      )
                      .reverse()
                      .map(m => (
                        <div key={m.id} className={`p-3 rounded-lg mb-2 ${m.sender_id === user?.id ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'}`}>
                          <p className="text-sm">{m.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {m.sender_id === user?.id ? 'You' : m.sender_name} • {formatDate(m.created_at)}
                          </p>
                        </div>
                      ))
                    }

                    <div className="flex gap-2 mt-4">
                      <Textarea
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={2}
                        className="flex-1"
                      />
                      <Button onClick={sendReply} disabled={isSending || !replyContent.trim()} className="self-end">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-2">
                {messages
                  .filter((m, i, arr) => {
                    // Show latest message per conversation thread
                    const otherId = m.sender_id === user?.id ? m.recipient_id : m.sender_id;
                    return arr.findIndex(x => {
                      const xOther = x.sender_id === user?.id ? x.recipient_id : x.sender_id;
                      return xOther === otherId;
                    }) === i;
                  })
                  .map(m => {
                    const isIncoming = m.recipient_id === user?.id;
                    return (
                      <Card
                        key={m.id}
                        className={`cursor-pointer hover:bg-muted/50 transition-colors ${!m.is_read && isIncoming ? 'border-primary/40 bg-primary/5' : ''}`}
                        onClick={() => {
                          setSelectedMessage(m);
                          if (!m.is_read && isIncoming) markAsRead(m.id);
                        }}
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          {isIncoming && !m.is_read ? (
                            <Mail className="w-5 h-5 text-primary shrink-0" />
                          ) : (
                            <MailOpen className="w-5 h-5 text-muted-foreground shrink-0" />
                          )}
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={m.sender_avatar || ''} />
                            <AvatarFallback>{m.sender_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`font-medium truncate ${!m.is_read && isIncoming ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {m.sender_id === user?.id ? `To: ${m.sender_name}` : m.sender_name}
                              </p>
                              <span className="text-xs text-muted-foreground shrink-0">{formatDate(m.created_at)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {m.subject ? `${m.subject} — ` : ''}{m.content}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentNotifications;
