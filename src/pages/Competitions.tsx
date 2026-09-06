import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy, Users, School, User, Plus, Clock, CheckCircle, Play, Loader2, Award, Share2, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow, format, isFuture, isPast } from "date-fns";

interface Competition {
  id: string;
  title: string;
  description: string | null;
  competition_type: string;
  subject: string;
  class_level: string | null;
  difficulty: string;
  questions: any;
  time_limit_minutes: number;
  status: string;
  created_by: string;
  winning_school: string | null;
  winning_participant_id: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
}

interface Participant {
  id: string;
  competition_id: string;
  user_id: string;
  school_name: string | null;
  score: number | null;
  time_spent: number | null;
  completed_at: string | null;
  full_name?: string;
}

const subjectOptions = [
  "Mathematics", "English", "Science", "Social Studies", "Physics", "Chemistry",
  "Biology", "Economics", "Geography", "Literature", "Government",
];

const Competitions = () => {
  const { user, hasRole } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeCompetition, setActiveCompetition] = useState<Competition | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myProfile, setMyProfile] = useState<{ school_name: string | null } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [compType, setCompType] = useState("individual");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [timeLimit, setTimeLimit] = useState("30");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    if (user) {
      fetchCompetitions();
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('school_name').eq('user_id', user.id).single();
    setMyProfile(data);
  };

  const fetchCompetitions = async () => {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCompetitions((data as Competition[]) || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCompetition = async () => {
    if (!user || !title || !subject) return;
    setCreating(true);
    try {
      const scheduledStart = startDate && startTime ? new Date(`${startDate}T${startTime}`).toISOString() : null;
      const scheduledEnd = endDate && endTime ? new Date(`${endDate}T${endTime}`).toISOString() : null;

      const { data, error } = await supabase.functions.invoke('generate-competition', {
        body: {
          title,
          description,
          competitionType: compType,
          subject,
          difficulty,
          timeLimitMinutes: parseInt(timeLimit),
          createdBy: user.id,
          startTime: scheduledStart,
          endTime: scheduledEnd,
        },
      });
      if (error) throw error;
      toast({ title: "Competition Created!", description: "AI has generated the questions. Competition is ready!" });
      setShowCreate(false);
      setTitle(""); setDescription(""); setSubject(""); setStartDate(""); setStartTime(""); setEndDate(""); setEndTime("");
      fetchCompetitions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const joinCompetition = async (competition: Competition) => {
    if (!user) return;

    // Check if competition hasn't started yet
    if (competition.start_time && isFuture(new Date(competition.start_time))) {
      toast({ title: "Not yet", description: `This competition starts on ${format(new Date(competition.start_time), 'PPp')}` });
      return;
    }

    // Check if competition has ended
    if (competition.end_time && isPast(new Date(competition.end_time))) {
      toast({ title: "Ended", description: "This competition has already ended." });
      viewResults(competition);
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('competition_participants')
        .select('id, completed_at')
        .eq('competition_id', competition.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing?.completed_at) {
        toast({ title: "Already completed", description: "You've already submitted your answers." });
        viewResults(competition);
        return;
      }

      if (!existing) {
        const { error } = await supabase.from('competition_participants').insert({
          competition_id: competition.id,
          user_id: user.id,
          school_name: myProfile?.school_name || null,
        });
        if (error) throw error;
      }

      setActiveCompetition(competition);
      setCurrentQuestion(0);
      setAnswers({});
      setTimeLeft(competition.time_limit_minutes * 60);
      setShowResults(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Timer
  useEffect(() => {
    if (!activeCompetition || timeLeft <= 0 || showResults) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitAnswers();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeCompetition, showResults]);

  const submitAnswers = async () => {
    if (!user || !activeCompetition || submitting) return;
    setSubmitting(true);
    try {
      const questions = activeCompetition.questions as any[];
      let score = 0;
      questions.forEach((q: any, i: number) => {
        if (answers[i] === q.correctAnswer) {
          score += q.points || 10;
        }
      });

      const timeSpent = activeCompetition.time_limit_minutes * 60 - timeLeft;

      const { error } = await supabase
        .from('competition_participants')
        .update({
          answers,
          score,
          time_spent: timeSpent,
          completed_at: new Date().toISOString(),
        })
        .eq('competition_id', activeCompetition.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setShowResults(true);
      toast({ title: "Submitted!", description: `You scored ${score} points!` });
      viewResults(activeCompetition);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const viewResults = async (competition: Competition) => {
    try {
      const { data, error } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('competition_id', competition.id)
        .not('completed_at', 'is', null)
        .order('score', { ascending: false });

      if (error) throw error;

      const userIds = (data || []).map(p => p.user_id);
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds)
        : { data: [] };

      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      setParticipants((data || []).map(p => ({
        ...p,
        full_name: nameMap.get(p.user_id) || 'Unknown',
      })));
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const formatTimeDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'school': return <School className="h-4 w-4" />;
      case 'group': return <Users className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getCompStatus = (comp: Competition) => {
    if (comp.start_time && isFuture(new Date(comp.start_time))) return 'upcoming';
    if (comp.end_time && isPast(new Date(comp.end_time))) return 'completed';
    return comp.status;
  };

  const shareCompetition = (comp: Competition) => {
    const url = `${window.location.origin}/competition/${comp.id}/live`;
    if (navigator.share) {
      navigator.share({ title: comp.title, text: `Watch the ${comp.title} competition live!`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Share this link for others to watch the competition live." });
    }
  };

  const getSchoolLeaderboard = () => {
    const schoolScores: Record<string, { total: number; count: number; participants: string[] }> = {};
    participants.forEach(p => {
      const school = p.school_name || 'Unknown School';
      if (!schoolScores[school]) schoolScores[school] = { total: 0, count: 0, participants: [] };
      schoolScores[school].total += p.score || 0;
      schoolScores[school].count += 1;
      schoolScores[school].participants.push(p.full_name || 'Unknown');
    });
    return Object.entries(schoolScores)
      .map(([school, data]) => ({ school, ...data, average: Math.round(data.total / data.count) }))
      .sort((a, b) => b.total - a.total);
  };

  // Active competition quiz view
  if (activeCompetition && !showResults) {
    const questions = activeCompetition.questions as any[];
    const question = questions[currentQuestion];
    const progress = (Object.keys(answers).length / questions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => {
                if (confirm('Leave competition? Your progress will be lost.')) setActiveCompetition(null);
              }}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold truncate">{activeCompetition.title}</h1>
            </div>
            <Badge variant={timeLeft < 60 ? "destructive" : "secondary"} className="gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTimeDisplay(timeLeft)}
            </Badge>
          </div>
          <div className="max-w-3xl mx-auto px-4 pb-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Question {currentQuestion + 1} of {questions.length} • {Object.keys(answers).length} answered
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Q{currentQuestion + 1}. {question.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(question.options as string[]).map((option: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion]: option }))}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    answers[currentQuestion] === option
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                  {option}
                </button>
              ))}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentQuestion(prev => prev - 1)} disabled={currentQuestion === 0}>
                  Previous
                </Button>
                {currentQuestion < questions.length - 1 ? (
                  <Button onClick={() => setCurrentQuestion(prev => prev + 1)}>Next</Button>
                ) : (
                  <Button onClick={submitAnswers} disabled={submitting}>
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</> : 'Submit Answers'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 mt-4">
            {questions.map((_: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentQuestion(idx)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                  idx === currentQuestion
                    ? 'bg-primary text-primary-foreground'
                    : answers[idx]
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Results view
  if (showResults && activeCompetition) {
    const isSchool = activeCompetition.competition_type === 'school';
    const schoolLeaderboard = isSchool ? getSchoolLeaderboard() : [];

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => { setActiveCompetition(null); setShowResults(false); }}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h1 className="text-lg font-bold">Competition Results</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => shareCompetition(activeCompetition)} className="gap-1">
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {isSchool && schoolLeaderboard.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><School className="h-5 w-5" />School Rankings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Individual Rankings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {participants.map((p, idx) => (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg ${p.user_id === user?.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'
                  }`}>{idx + 1}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{p.full_name} {p.user_id === user?.id && '(You)'}</p>
                    <p className="text-xs text-muted-foreground">{p.school_name || 'No school'} • {p.time_spent ? `${Math.round(p.time_spent / 60)}min` : ''}</p>
                  </div>
                  <Badge>{p.score || 0} pts</Badge>
                </div>
              ))}
              {participants.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No results yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main competitions list
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <Trophy className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Competitions</h1>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />Create</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Competition</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Competition title" value={title} onChange={e => setTitle(e.target.value)} />
                <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
                <Select value={compType} onValueChange={setCompType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School vs School</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-3">
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={timeLimit} onValueChange={setTimeLimit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Schedule */}
                <div className="space-y-3 border rounded-lg p-3">
                  <p className="text-sm font-medium flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Schedule (optional)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Start Date</label>
                      <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Start Time</label>
                      <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">End Date</label>
                      <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">End Time</label>
                      <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Leave empty to start immediately</p>
                </div>

                <Button onClick={createCompetition} disabled={creating || !title || !subject} className="w-full">
                  {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />AI is generating questions...</> : 'Create Competition'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          </div>
        ) : competitions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium text-muted-foreground">No competitions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create a competition to challenge others!</p>
            </CardContent>
          </Card>
        ) : (
          competitions.map(comp => {
            const status = getCompStatus(comp);
            return (
              <Card key={comp.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(comp.competition_type)}
                        <Badge variant="outline" className="text-xs capitalize">{comp.competition_type}</Badge>
                        <Badge variant={status === 'active' ? 'default' : status === 'upcoming' ? 'outline' : 'secondary'} className="text-xs capitalize">
                          {status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse mr-1" />}
                          {status}
                        </Badge>
                      </div>
                      <CardTitle className="text-base">{comp.title}</CardTitle>
                      {comp.description && <CardDescription className="mt-1">{comp.description}</CardDescription>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => shareCompetition(comp)} className="shrink-0">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />{comp.subject}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{comp.time_limit_minutes} min</span>
                    <span className="capitalize">{comp.difficulty}</span>
                  </div>
                  {comp.start_time && (
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Starts: {format(new Date(comp.start_time), 'PPp')}</span>
                      {comp.end_time && <span>Ends: {format(new Date(comp.end_time), 'PPp')}</span>}
                    </div>
                  )}
                  {comp.winning_school && (
                    <Badge className="mb-3 gap-1"><School className="h-3 w-3" />Winner: {comp.winning_school}</Badge>
                  )}
                  <div className="flex gap-2">
                    {(status === 'active' || (status === 'upcoming' && !comp.start_time)) && (
                      <Button size="sm" onClick={() => joinCompetition(comp)} className="gap-1">
                        <Play className="h-3.5 w-3.5" />Join Competition
                      </Button>
                    )}
                    {status === 'upcoming' && comp.start_time && (
                      <Button size="sm" variant="outline" disabled className="gap-1">
                        <Clock className="h-3.5 w-3.5" />Starts {formatDistanceToNow(new Date(comp.start_time), { addSuffix: true })}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setActiveCompetition(comp); setShowResults(true); viewResults(comp); }}>
                      View Results
                    </Button>
                    <Link to={`/competition/${comp.id}/live`}>
                      <Button size="sm" variant="ghost" className="gap-1"><Users className="h-3.5 w-3.5" />Watch Live</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Competitions;
