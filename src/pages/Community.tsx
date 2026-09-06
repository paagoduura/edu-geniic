import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Heart, MessageCircle, Send, Plus, X, BookOpen, Users, TrendingUp, Flame, School, Trophy, Clock, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow, format, isFuture, isPast } from "date-fns";

interface Post {
  id: string;
  author_id: string;
  content: string;
  subject: string | null;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  author_school: string | null;
  is_liked: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  author_school: string | null;
}

const subjectOptions = [
  "Mathematics", "English", "Science", "Social Studies", "Yoruba", "Hausa",
  "Igbo", "French", "Physics", "Chemistry", "Biology", "Economics",
  "Geography", "Literature", "Government",
];

interface CompetitionSummary {
  id: string;
  title: string;
  subject: string;
  competition_type: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  time_limit_minutes: number;
}

const Community = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostSubject, setNewPostSubject] = useState("");
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'trending'>('feed');
  const [subjectFilter, setSubjectFilter] = useState<string>('');

  const filteredPosts = subjectFilter
    ? posts.filter(p => p.subject?.toLowerCase() === subjectFilter.toLowerCase())
    : posts;

  useEffect(() => {
    fetchPosts();
    fetchCompetitions();

    const channel = supabase
      .channel('community-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchCompetitions = async () => {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('id, title, subject, competition_type, status, start_time, end_time, time_limit_minutes')
        .in('status', ['active', 'pending'])
        .order('start_time', { ascending: true })
        .limit(10);
      if (!error) setCompetitions((data as CompetitionSummary[]) || []);
    } catch (e) {
      console.error('Error fetching competitions:', e);
    }
  };

  const fetchPosts = async () => {
    if (!user) return;
    try {
      const { data: postsData, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch author profiles and like status
      const authorIds = [...new Set((postsData || []).map(p => p.author_id))];
      const postIds = (postsData || []).map(p => p.id);

      const [profilesRes, likesRes] = await Promise.all([
        authorIds.length > 0
          ? supabase.from('profiles').select('user_id, full_name, avatar_url, school_name').in('user_id', authorIds)
          : { data: [], error: null },
        postIds.length > 0
          ? supabase.from('community_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds)
          : { data: [], error: null },
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
      const likedPostIds = new Set((likesRes.data || []).map(l => l.post_id));

      const enrichedPosts: Post[] = (postsData || []).map(post => {
        const profile = profileMap.get(post.author_id);
        return {
          ...post,
          tags: (post.tags as string[]) || [],
          author_name: profile?.full_name || 'Anonymous',
          author_avatar: profile?.avatar_url || null,
          author_school: profile?.school_name || null,
          is_liked: likedPostIds.has(post.id),
        };
      });

      setPosts(enrichedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!user || !newPostContent.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('community_posts').insert({
        author_id: user.id,
        content: newPostContent.trim(),
        subject: newPostSubject || null,
        tags: newPostSubject ? [newPostSubject.toLowerCase()] : [],
      });

      if (error) throw error;
      setNewPostContent("");
      setNewPostSubject("");
      setShowCreatePost(false);
      toast({ title: "Posted!", description: "Your post is now live in the community." });
      fetchPosts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;
    try {
      if (isLiked) {
        await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('community_likes').insert({ post_id: postId, user_id: user.id });
      }
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, is_liked: !isLiked, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const authorIds = [...new Set((data || []).map(c => c.author_id))];
      const { data: profiles } = authorIds.length > 0
        ? await supabase.from('profiles').select('user_id, full_name, avatar_url, school_name').in('user_id', authorIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      setComments((data || []).map(c => {
        const profile = profileMap.get(c.author_id);
        return {
          ...c,
          author_name: profile?.full_name || 'Anonymous',
          author_avatar: profile?.avatar_url || null,
          author_school: profile?.school_name || null,
        };
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const openComments = (postId: string) => {
    setShowComments(postId);
    fetchComments(postId);
  };

  const addComment = async () => {
    if (!user || !showComments || !newComment.trim()) return;
    try {
      const { error } = await supabase.from('community_comments').insert({
        post_id: showComments,
        author_id: user.id,
        content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment("");
      fetchComments(showComments);
      fetchPosts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from('community_posts').delete().eq('id', postId);
      if (error) throw error;
      toast({ title: "Post deleted" });
      fetchPosts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">Community</h1>
            </div>
          </div>
          <Button onClick={() => setShowCreatePost(true)} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Post
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Tabs & Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={activeTab === 'feed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('feed')}
            className="gap-1.5"
          >
            <Users className="h-4 w-4" />
            Feed ({filteredPosts.length})
          </Button>
          <Button
            variant={activeTab === 'trending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('trending')}
            className="gap-1.5"
          >
            <Flame className="h-4 w-4" />
            Trending
          </Button>
          <div className="ml-auto">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">All subjects</option>
              {subjectOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Competitions Section */}
        {competitions.length > 0 && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Competitions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {competitions.map(comp => {
                const isLive = comp.status === 'active' && (!comp.start_time || isPast(new Date(comp.start_time)));
                const isUpcoming = comp.start_time && isFuture(new Date(comp.start_time));
                return (
                  <div key={comp.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-card border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{comp.title}</p>
                        <Badge variant={isLive ? "default" : "outline"} className="text-[10px] shrink-0">
                          {isLive && <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse mr-1" />}
                          {isLive ? 'LIVE' : isUpcoming ? 'Upcoming' : comp.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {comp.subject} • {comp.competition_type}
                        {comp.start_time && isUpcoming && ` • Starts ${formatDistanceToNow(new Date(comp.start_time), { addSuffix: true })}`}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Link to={`/competition/${comp.id}/live`}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"><Play className="h-3 w-3" />Watch</Button>
                      </Link>
                      <Link to="/competitions">
                        <Button size="sm" variant="outline" className="h-7 text-xs">Join</Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Trending Section */}
        {activeTab === 'trending' && !loading && filteredPosts.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Most liked and discussed posts</p>
            {[...filteredPosts]
              .sort((a, b) => (b.likes_count + b.comments_count) - (a.likes_count + a.comments_count))
              .slice(0, 10)
              .map((post, index) => (
                <Card key={post.id} className="overflow-hidden border-accent/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-accent/10 text-accent font-bold text-xs shrink-0">
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={post.author_avatar || undefined} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {getInitials(post.author_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-sm">{post.author_name}</span>
                          {post.author_school && (
                            <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                              <School className="h-2.5 w-2.5" />{post.author_school}
                            </Badge>
                          )}
                          {post.subject && (
                            <Badge variant="secondary" className="text-xs">{post.subject}</Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-foreground line-clamp-3 whitespace-pre-wrap">{post.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5 text-red-500" /> {post.likes_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5 text-primary" /> {post.comments_count}
                          </span>
                          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {filteredPosts.every(p => p.likes_count === 0 && p.comments_count === 0) && (
              <Card className="text-center py-8">
                <CardContent>
                  <Flame className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No trending posts yet. Like and comment to get things going!</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Create Post Modal */}
        {activeTab === 'feed' && showCreatePost && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Share what you're studying</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowCreatePost(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="What are you learning today? Share a question, tip, or study update..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <select
                  value={newPostSubject}
                  onChange={(e) => setNewPostSubject(e.target.value)}
                  className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select subject (optional)</option>
                  {subjectOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={createPost}
                disabled={!newPostContent.trim() || submitting}
                className="w-full"
              >
                {submitting ? "Posting..." : "Post to Community"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Posts Feed */}
        {activeTab === 'feed' && (loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">Loading posts...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground font-medium">No posts yet</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to share what you're studying!</p>
              <Button onClick={() => setShowCreatePost(true)} className="mt-4" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Create First Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map(post => (
            <Card key={post.id} className="overflow-hidden">
              <CardContent className="p-4">
                {/* Author row */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={post.author_avatar || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(post.author_name)}
                    </AvatarFallback>
                  </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{post.author_name}</span>
                        {post.author_school && (
                          <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                            <School className="h-2.5 w-2.5" />{post.author_school}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    {post.subject && (
                      <Badge variant="secondary" className="mt-1 text-xs">{post.subject}</Badge>
                    )}
                  </div>
                  {post.author_id === user?.id && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deletePost(post.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Content */}
                <p className="mt-3 text-sm text-foreground whitespace-pre-wrap">{post.content}</p>

                {/* Actions */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => toggleLike(post.id, post.is_liked)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${
                      post.is_liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                    {post.likes_count}
                  </button>
                  <button
                    onClick={() => openComments(post.id)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {post.comments_count}
                  </button>
                </div>

                {/* Comments section */}
                {showComments === post.id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3">
                    {comments.length > 0 ? (
                      <ScrollArea className="max-h-60">
                        <div className="space-y-3">
                          {comments.map(comment => (
                            <div key={comment.id} className="flex gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={comment.author_avatar || undefined} />
                                <AvatarFallback className="text-[10px] bg-muted">
                                  {getInitials(comment.author_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 bg-muted rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-xs">{comment.author_name}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                                <p className="text-sm mt-0.5">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addComment()}
                        className="flex-1 h-9 text-sm"
                      />
                      <Button size="icon" className="h-9 w-9" onClick={addComment} disabled={!newComment.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ))}
      </div>
    </div>
  );
};

export default Community;
