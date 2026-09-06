import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, CircleAlert, Clock3, GraduationCap, Plus, Sparkles, Wrench } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface LearningTrack {
  id: string;
  school_id: string;
  title: string;
  slug: string;
  description: string | null;
  track_type: string;
  learner_stage: string;
  status: "draft" | "published" | "archived";
  estimated_hours: number | null;
}

const trackTypes = [
  { value: "academic", label: "Academic" },
  { value: "creative", label: "Creative arts" },
  { value: "technical", label: "Technical" },
  { value: "vocational", label: "Vocational" },
  { value: "entrepreneurship", label: "Entrepreneurship" },
  { value: "personal_development", label: "Personal development" },
] as const;

const learnerStages = ["nursery", "primary", "secondary", "tertiary", "adult", "all_ages"] as const;

const toSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const labelize = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

const PracticalLearning = ({ adminMode = false }: { adminMode?: boolean }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<LearningTrack[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", track_type: "vocational", learner_stage: "secondary", estimated_hours: "" });

  const loadTracks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const membershipQuery = supabase
      .from("school_members")
      .select("school_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    const { data: membership, error: membershipError } = await membershipQuery;

    if (membershipError) {
      setError("We could not load your school workspace. Please try again.");
      setLoading(false);
      return;
    }

    if (!membership?.school_id) {
      setSchoolId(null);
      setTracks([]);
      setLoading(false);
      return;
    }

    setSchoolId(membership.school_id);
    const query = supabase
      .from("learning_tracks" as never)
      .select("id, school_id, title, slug, description, track_type, learner_stage, status, estimated_hours")
      .eq("school_id", membership.school_id)
      .order("created_at", { ascending: false });
    const { data, error: tracksError } = adminMode ? await query : await query.eq("status", "published");

    if (tracksError) {
      setError("Practical learning is not available in this school workspace yet. An administrator may need to apply the latest database migration.");
      setLoading(false);
      return;
    }

    setTracks((data || []) as LearningTrack[]);
    setLoading(false);
  }, [adminMode, user]);

  useEffect(() => {
    void loadTracks();
  }, [loadTracks]);

  const filteredTracks = useMemo(() => tracks.filter((track) => {
    return (typeFilter === "all" || track.track_type === typeFilter) && (stageFilter === "all" || track.learner_stage === stageFilter);
  }), [stageFilter, tracks, typeFilter]);

  const createTrack = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !schoolId || !form.title.trim()) return;
    setSaving(true);

    const { error: insertError } = await supabase.from("learning_tracks" as never).insert({
      school_id: schoolId,
      title: form.title.trim(),
      slug: toSlug(form.title),
      description: form.description.trim() || null,
      track_type: form.track_type,
      learner_stage: form.learner_stage,
      estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
      created_by: user.id,
      status: "draft",
    } as never);

    setSaving(false);
    if (insertError) {
      toast({ title: "Could not create track", description: insertError.message, variant: "destructive" });
      return;
    }

    setForm({ title: "", description: "", track_type: "vocational", learner_stage: "secondary", estimated_hours: "" });
    toast({ title: "Learning track created", description: "It is saved as a draft until your team publishes it." });
    await loadTracks();
  };

  const pageTitle = adminMode ? "Learning tracks" : "Practical learning";
  const pageDescription = adminMode
    ? "Design school-owned academic, creative, technical, and vocational pathways."
    : "Build real-world skills through guided projects, evidence, feedback, and competency milestones.";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Button variant="ghost" className="gap-2" onClick={() => navigate(adminMode ? "/school" : "/dashboard")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Link to="/" className="font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">EduGenie</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <section className="rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground p-6 md:p-8 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <Badge variant="secondary" className="gap-2"><Sparkles className="h-3.5 w-3.5" /> World-ready skills pathway</Badge>
              <h1 className="text-3xl md:text-4xl font-bold">{pageTitle}</h1>
              <p className="text-primary-foreground/85">{pageDescription}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-5 min-w-48">
              <Wrench className="h-8 w-8 mb-3" />
              <p className="text-2xl font-bold">{tracks.length}</p>
              <p className="text-sm text-primary-foreground/75">{adminMode ? "School pathways" : "Available pathways"}</p>
            </div>
          </div>
        </section>

        {adminMode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Create a learning track</CardTitle>
              <CardDescription>Start with a draft. Add modules, competencies, projects, and rubrics in the next configuration step.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createTrack} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2"><Label htmlFor="track-title">Track name</Label><Input id="track-title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Professional Baking Foundations" /></div>
                <div className="space-y-2"><Label htmlFor="track-type">Track type</Label><select id="track-type" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.track_type} onChange={(event) => setForm({ ...form, track_type: event.target.value })}>{trackTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="track-stage">Learner stage</Label><select id="track-stage" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.learner_stage} onChange={(event) => setForm({ ...form, learner_stage: event.target.value })}>{learnerStages.map((stage) => <option key={stage} value={stage}>{labelize(stage)}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="track-hours">Estimated hours</Label><Input id="track-hours" type="number" min="1" value={form.estimated_hours} onChange={(event) => setForm({ ...form, estimated_hours: event.target.value })} placeholder="Optional" /></div>
                <div className="space-y-2 md:col-span-2"><Label htmlFor="track-description">Description</Label><Textarea id="track-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the outcomes learners should achieve." /></div>
                <div className="md:col-span-2"><Button type="submit" disabled={saving || !schoolId}>{saving ? "Creating…" : "Create draft track"}</Button></div>
              </form>
            </CardContent>
          </Card>
        )}

        <section className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div><h2 className="text-2xl font-bold">{adminMode ? "Your school catalogue" : "Explore pathways"}</h2><p className="text-muted-foreground">Filter by the learner and the outcome you want to develop.</p></div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Filter by track type" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All types</option>{trackTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
            <select aria-label="Filter by learner stage" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">All stages</option>{learnerStages.map((stage) => <option key={stage} value={stage}>{labelize(stage)}</option>)}</select>
          </div>
        </section>

        {loading && <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <Card key={item} className="animate-pulse h-48 bg-muted/40" />)}</div>}
        {!loading && error && <Card className="border-destructive/40"><CardContent className="py-8 flex items-start gap-3"><CircleAlert className="h-5 w-5 text-destructive mt-0.5" /><div><p className="font-medium">Unable to load tracks</p><p className="text-sm text-muted-foreground mt-1">{error}</p><Button variant="outline" className="mt-4" onClick={() => void loadTracks()}>Try again</Button></div></CardContent></Card>}
        {!loading && !error && !schoolId && <Card><CardContent className="py-12 text-center space-y-3"><GraduationCap className="h-10 w-10 mx-auto text-muted-foreground" /><h2 className="text-xl font-semibold">Join a school to continue</h2><p className="text-muted-foreground max-w-md mx-auto">Practical pathways are managed by each school so instructors can provide safe, relevant feedback.</p></CardContent></Card>}
        {!loading && !error && schoolId && filteredTracks.length === 0 && <Card><CardContent className="py-12 text-center space-y-3"><BookOpen className="h-10 w-10 mx-auto text-muted-foreground" /><h2 className="text-xl font-semibold">No tracks match this view</h2><p className="text-muted-foreground">Try another filter or ask your school to publish a new pathway.</p></CardContent></Card>}
        {!loading && !error && filteredTracks.length > 0 && <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{filteredTracks.map((track) => <Card key={track.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`${adminMode ? "/school/learning-tracks" : "/practical-learning"}/${track.id}`)}><CardHeader><div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-primary/10 p-3"><Wrench className="h-5 w-5 text-primary" /></div><Badge variant={track.status === "published" ? "default" : "secondary"}>{labelize(track.status)}</Badge></div><CardTitle className="pt-2">{track.title}</CardTitle><CardDescription>{track.description || "A structured pathway with guided practice and evidence-based assessment."}</CardDescription></CardHeader><CardContent><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><Badge variant="outline">{labelize(track.track_type)}</Badge><Badge variant="outline">{labelize(track.learner_stage)}</Badge>{track.estimated_hours && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {track.estimated_hours}h</span>}</div><Button variant="ghost" className="w-full justify-between mt-5 group-hover:bg-primary/5">View pathway <ChevronRight className="h-4 w-4" /></Button></CardContent></Card>)}</div>}

        {!adminMode && <Card className="border-primary/20 bg-primary/5"><CardContent className="p-5 flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-primary mt-0.5" /><div><p className="font-semibold">How practical learning works</p><p className="text-sm text-muted-foreground mt-1">Learn the theory, practise safely, submit evidence, receive instructor feedback, and build a verified portfolio of demonstrated skills.</p></div></CardContent></Card>}
      </main>
    </div>
  );
};

export default PracticalLearning;
