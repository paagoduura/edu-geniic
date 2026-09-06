import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Send, Bot, User, Plus, MessageCircle, Mic, Keyboard, BookOpen, Calculator, HelpCircle, Lightbulb, Image, X } from 'lucide-react';
import { VoiceStudyBuddy } from '@/components/VoiceStudyBuddy';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

const quickPrompts = [
  { icon: Calculator, label: 'Solve a problem', prompt: 'Please solve this step by step:\n\n' },
  { icon: HelpCircle, label: 'Explain a concept', prompt: 'Please explain in detail:\n\n' },
  { icon: BookOpen, label: 'Practice questions', prompt: 'Give me 5 practice questions on:\n\n' },
  { icon: Lightbulb, label: 'Study tips', prompt: 'What are the best study tips for:\n\n' },
];

const AIStudyBuddy = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<'text' | 'voice'>('voice');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSessions();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchSessions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .select('id, title, created_at')
      .eq('student_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching sessions:', error);
      return;
    }

    setSessions(data || []);
  };

  const loadSession = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading session:', error);
      return;
    }

    const typedMessages = (data || []).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));
    
    setMessages(typedMessages);
    setCurrentSessionId(sessionId);
  };

  const createNewSession = async (): Promise<string | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        student_id: user.id,
        title: 'New Chat',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return null;
    }

    setCurrentSessionId(data.id);
    setMessages([]);
    fetchSessions();
    return data.id;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Image must be under 10MB', variant: 'destructive' });
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setMode('text');
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('chat-images').upload(path, file);
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(path);
    return publicUrl;
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || !user || loading) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      const title = input.slice(0, 50) || 'Image Question';
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert({ student_id: user.id, title })
        .select()
        .single();
      if (error) { console.error('Error creating session:', error); return; }
      sessionId = data.id;
      setCurrentSessionId(sessionId);
      fetchSessions();
    }

    setLoading(true);
    let imageUrl: string | undefined;

    if (selectedImage) {
      setUploadingImage(true);
      const url = await uploadImage(selectedImage);
      setUploadingImage(false);
      if (!url) {
        toast({ title: 'Upload failed', description: 'Could not upload image', variant: 'destructive' });
        setLoading(false);
        return;
      }
      imageUrl = url;
      clearImage();
    }

    const userMessage: Message = {
      role: 'user',
      content: input || 'Please solve this problem from the image.',
      imageUrl,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-study-buddy', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
            ...(m.imageUrl ? { imageUrl: m.imageUrl } : {}),
          })),
          sessionId,
          language: currentLanguage,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to get response from AI',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    setMode('text');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">AI Study Buddy</h1>
            <p className="text-muted-foreground">Ask questions, solve problems, get detailed explanations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sessions Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Chat History</CardTitle>
                  <Button size="sm" variant="ghost" onClick={createNewSession}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <Button
                        key={session.id}
                        variant={currentSessionId === session.id ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => loadSession(session.id)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        <span className="truncate">{session.title}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[700px] flex flex-col overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-6 w-6 text-primary" />
                    Study Buddy
                  </CardTitle>
                  
                  <Tabs value={mode} onValueChange={(v) => setMode(v as 'text' | 'voice')}>
                    <TabsList className="grid w-[200px] grid-cols-2">
                      <TabsTrigger value="voice" className="gap-2">
                        <Mic className="h-4 w-4" />
                        Voice
                      </TabsTrigger>
                      <TabsTrigger value="text" className="gap-2">
                        <Keyboard className="h-4 w-4" />
                        Text
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                {mode === 'voice' ? (
                  <VoiceStudyBuddy 
                    sessionId={currentSessionId}
                    onSessionCreate={createNewSession}
                    className="flex-1"
                  />
                ) : (
                  <>
                    <ScrollArea className="flex-1 px-6" ref={scrollRef}>
                      <div className="space-y-4 py-4">
                        {messages.length === 0 && (
                          <div className="text-center py-8">
                            <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                              What would you like help with?
                            </h3>
                            <p className="text-muted-foreground mb-6">
                              Give me a problem to solve, ask a question, or pick a quick action below
                            </p>
                            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                              {quickPrompts.map((qp) => (
                                <Button
                                  key={qp.label}
                                  variant="outline"
                                  className="h-auto py-3 px-4 flex flex-col items-center gap-2 text-sm"
                                  onClick={() => handleQuickPrompt(qp.prompt)}
                                >
                                  <qp.icon className="h-5 w-5 text-primary" />
                                  {qp.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        {messages.map((message, index) => (
                          <div
                            key={index}
                            className={`flex gap-3 ${
                              message.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {message.role === 'assistant' && (
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                                <Bot className="h-5 w-5 text-primary" />
                              </div>
                            )}
                            <div
                              className={`rounded-lg px-4 py-3 max-w-[85%] ${
                                message.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary text-secondary-foreground'
                              }`}
                            >
                              {message.imageUrl && (
                                <img
                                  src={message.imageUrl}
                                  alt="Uploaded question"
                                  className="rounded-md max-w-full max-h-48 mb-2"
                                />
                              )}
                              {message.role === 'assistant' ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                  <ReactMarkdown>{message.content}</ReactMarkdown>
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap">{message.content}</p>
                              )}
                            </div>
                            {message.role === 'user' && (
                              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                                <User className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                        ))}
                        {loading && (
                          <div className="flex gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Bot className="h-5 w-5 text-primary" />
                            </div>
                            <div className="bg-secondary rounded-lg px-4 py-3">
                              <p className="text-sm text-muted-foreground mb-1">Thinking...</p>
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    <div className="p-4 border-t space-y-2">
                      {imagePreview && (
                        <div className="relative inline-block">
                          <img src={imagePreview} alt="Selected" className="h-20 rounded-md border border-border" />
                          <button
                            onClick={clearImage}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageSelect}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="self-end h-[60px] w-[48px] shrink-0"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={loading}
                          title="Upload image of a question"
                        >
                          <Image className="h-5 w-5" />
                        </Button>
                        <Textarea
                          ref={textareaRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={selectedImage ? "Add a question about the image (optional)..." : "Type a question, paste a problem to solve... (Shift+Enter for new line)"}
                          disabled={loading}
                          className="min-h-[60px] max-h-[150px] resize-none"
                          rows={2}
                        />
                        <Button 
                          onClick={sendMessage} 
                          disabled={loading || (!input.trim() && !selectedImage)}
                          className="self-end h-[60px] px-4"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      {messages.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {quickPrompts.map((qp) => (
                            <Button
                              key={qp.label}
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 gap-1"
                              onClick={() => handleQuickPrompt(qp.prompt)}
                            >
                              <qp.icon className="h-3 w-3" />
                              {qp.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIStudyBuddy;
