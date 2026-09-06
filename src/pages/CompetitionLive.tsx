import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, School, Clock, Users, ArrowLeft, Share2, Loader2, Award } from "lucide-react";
import { formatDistanceToNow, format, isPast, isFuture } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Competition {
  id: string;
  title: string;
  description: string | null;
  competition_type: string;
  subject: string;
  difficulty: string;
  time_limit_minutes: number;
  status: string;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
}

interface Participant {
  id: string;
  user_id: string;
  school_name: string | null;
  score: number | null;
  time_spent: number | null;
  completed_at: string | null;
  joined_at: string;
  full_name?: string;
  avatar_url?: string | null;
}

const CompetitionLive = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (competitionId) {
      fetchCompetition();
      fetchParticipants();

      // Realtime updates for participants
      const channel = supabase
        .channel(`competition-live-${competitionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'competition_participants',
          filter: `competition_id=eq.${competitionId}`,
        }, () => {
          fetchParticipants();
        })
        .subscribe();

      // Poll every 10s for fresh data
      const interval = setInterval(fetchParticipants, 10000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [competitionId]);

  const fetchCompetition = async () => {
    if (!competitionId) return;
    const { data, error } = await supabase
      .from('competitions')
      .select('id, title, description, competition_type, subject, difficulty, time_limit_minutes, status, start_time, end_time, created_at')
      .eq('id', competitionId)
      .single();
    if (!error && data) setCompetition(data as Competition);
    setLoading(false);
  };

  const fetchParticipants = async () => {
    if (!competitionId) return;
    const { data, error } = await supabase
      .from('competition_participants')
      .select('*')
      .eq('competition_id', competitionId)
      .order('score', { ascending: false });

    if (error) return;

    const userIds = (data || []).map(p => p.user_id);
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    setParticipants((data || []).map(p => {
      const profile = profileMap.get(p.user_id);
      return {
        ...p,
        full_name: profile?.full_name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
      };
    }));
  };

  const shareLink = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: competition?.title, text: `Watch the ${competition?.title} competition live!`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Share this link for others to watch the competition live." });
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getSchoolLeaderboard = () => {
    const schoolScores: Record<string, { total: number; count: number; participants: Participant[] }> = {};
    participants.forEach(p => {
      const school = p.school_name || 'Unknown School';
      if (!schoolScores[school]) schoolScores[school] = { total: 0, count: 0, participants: [] };
      schoolScores[school].total += p.score || 0;
      schoolScores[school].count += 1;
      schoolScores[school].participants.push(p);
    });
    return Object.entries(schoolScores)
      .map(([school, data]) => ({ school, ...data, average: Math.round(data.total / data.count) }))
      .sort((a, b) => b.total - a.total);
  };

  const getStatus = () => {
    if (!competition) return 'unknown';
    if (competition.start_time && isFuture(new Date(competition.start_time))) return 'upcoming';
    if (competition.end_time && isPast(new Date(competition.end_time))) return 'completed';
    if (competition.status === 'active') return 'live';
    return competition.status;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Card className="max-w-md text-center p-8">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-medium">Competition not found</p>
          <Link to="/competitions"><Button className="mt-4" size="sm">Back to Competitions</Button></Link>
        </Card>
      </div>
    );
  }

  const status = getStatus();
  const isSchool = competition.competition_type === 'school';
  const schoolLeaderboard = isSchool ? getSchoolLeaderboard() : [];
  const completedParticipants = participants.filter(p => p.completed_at);
  const activeParticipants = participants.filter(p => !p.completed_at);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/competitions">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <h1 className="text-lg font-bold">{competition.title}</h1>
              </div>
              <p className="text-xs text-muted-foreground">{competition.subject} • {competition.difficulty} • {competition.time_limit_minutes} min</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={status === 'live' ? 'default' : status === 'upcoming' ? 'outline' : 'secondary'} className="gap-1">
              {status === 'live' && <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />}
              {status === 'live' ? 'LIVE' : status === 'upcoming' ? 'Upcoming' : 'Completed'}
            </Badge>
            <Button variant="outline" size="icon" onClick={shareLink}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Competition Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              {competition.start_time && (
                <div>
                  <p className="text-xs text-muted-foreground">Starts</p>
                  <p className="font-medium">{format(new Date(competition.start_time), 'PPp')}</p>
                </div>
              )}
              {competition.end_time && (
                <div>
                  <p className="text-xs text-muted-foreground">Ends</p>
                  <p className="font-medium">{format(new Date(competition.end_time), 'PPp')}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Participants</p>
                <p className="font-medium flex items-center gap-1"><Users className="h-3.5 w-3.5" />{participants.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="font-medium">{completedParticipants.length} / {participants.length}</p>
              </div>
            </div>
            {competition.description && <p className="text-sm text-muted-foreground mt-3">{competition.description}</p>}
          </CardContent>
        </Card>

        {/* School Leaderboard */}
        {isSchool && schoolLeaderboard.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <School className="h-5 w-5" />
                School Rankings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {schoolLeaderboard.map((school, idx) => (
                <div key={school.school} className={`flex items-center gap-3 p-3 rounded-lg ${idx === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-muted/50'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'
                  }`}>{idx + 1}</div>
                  <div className="flex-1">
                    <p className="font-semibold">{school.school}</p>
                    <p className="text-xs text-muted-foreground">{school.count} participant(s) • Avg: {school.average}pts</p>
                  </div>
                  <Badge variant={idx === 0 ? "default" : "secondary"}>{school.total} pts</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Active Participants */}
        {activeParticipants.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-orange-500" />
                Currently Competing ({activeParticipants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {activeParticipants.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10">{getInitials(p.full_name || 'U')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium">{p.full_name}</p>
                      {p.school_name && <p className="text-[10px] text-muted-foreground">{p.school_name}</p>}
                    </div>
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Leaderboard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5 text-yellow-500" />
              Leaderboard ({completedParticipants.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedParticipants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {status === 'upcoming' ? 'Competition hasn\'t started yet' : 'No one has finished yet — watch for live updates!'}
              </p>
            ) : (
              completedParticipants.map((p, idx) => (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg ${idx === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-muted/30'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'
                  }`}>{idx + 1}</div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10">{getInitials(p.full_name || 'U')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.school_name || 'No school'} • {p.time_spent ? `${Math.round(p.time_spent / 60)}min` : ''}</p>
                  </div>
                  <Badge>{p.score || 0} pts</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompetitionLive;
