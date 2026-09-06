import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CheckCircle2, CircleAlert, Clock3, ListChecks, Plus, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Track { id: string; school_id: string; title: string; description: string | null; track_type: string; learner_stage: string; status: string; estimated_hours: number | null; }
interface TrackModule { id: string; title: string; description: string | null; sequence_number: number; module_type: string; safety_required: boolean; estimated_minutes: number | null; }

const labelize = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

const PracticalTrackDetail = ({ adminMode = false }: { adminMode?: boolean }) => {
  const { trackId } = useParams<{ trackId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [track, setTrack] = useState<Track | null>(null);
  const [modules, setModules] = useState<TrackModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", module_type: "lesson", estimated_minutes: "", safety_required: false });

  const loadTrack = useCallback(async () => {
    if (!trackId) return;
    setLoading(true);
    setError(null);
    const { data: trackData, error: trackError } = await supabase.from("learning_tracks" as never).select("id, school_id, title, description, track_type, learner_stage, status, estimated_hours").eq("id", trackId).maybeSingle();
    if (trackError || !trackData) {
      setError("This learning pathway could not be found or is not available to your school.");
      setLoading(false);
      return;
    }
    const { data: moduleData, error: modulesError } = await supabase.from("learning_track_modules" as never).select("id, title, description, sequence_number, module_type, safety_required, estimated_minutes").eq("track_id", trackId).order("sequence_number", { ascending: true });
    if (modulesError) {
      setError("The pathway loaded, but its modules could not be retrieved.");
      setLoading(false);
      return;
    }
    setTrack(trackData as Track);
    setModules((moduleData || []) as TrackModule[]);
    setLoading(false);
  }, [trackId]);

  useEffect(() => { void loadTrack(); }, [loadTrack]);

  const addModule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trackId || !track || !user || !form.title.trim()) return;
    setSaving(true);
    const { error: insertError } = await supabase.from("learning_track_modules" as never).insert({
      track_id: trackId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      sequence_number: modules.length + 1,
      module_type: form.module_type,
      estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
      safety_required: form.safety_required,
    } as never);
    setSaving(false);
    if (insertError) {
      toast({ title: "Could not add module", description: insertError.message, variant: "destructive" });
      return;
    }
    setForm({ title: "", description: "", module_type: "lesson", estimated_minutes: "", safety_required: false });
    toast({ title: "Module added", description: "The next module is now part of this pathway." });
    await loadTrack();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  if (error || !track) return <div className="min-h-screen flex items-center justify-center p-4"><Card className="max-w-md"><CardContent className="py-8 text-center space-y-3"><CircleAlert className="h-10 w-10 mx-auto text-destructive" /><h1 className="font-semibold">Unable to open pathway</h1><p className="text-sm text-muted-foreground">{error}</p><Button onClick={() => navigate(adminMode ? "/school/learning-tracks" : "/practical-learning")}>Back to pathways</Button></CardContent></Card></div>;

  return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5"><header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10"><div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4"><Button variant="ghost" className="gap-2" onClick={() => navigate(adminMode ? "/school/learning-tracks" : "/practical-learning")}><ArrowLeft className="h-4 w-4" /> Back to pathways</Button><Link to="/" className="font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">EduGenie</Link></div></header><main className="max-w-5xl mx-auto px-4 py-8 space-y-8"><section className="rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground p-6 md:p-8"><div className="flex items-start gap-4"><div className="rounded-xl bg-white/15 p-3"><Wrench className="h-7 w-7" /></div><div className="space-y-3"><Badge variant="secondary">{labelize(track.track_type)} · {labelize(track.learner_stage)}</Badge><h1 className="text-3xl font-bold">{track.title}</h1><p className="text-primary-foreground/85 max-w-2xl">{track.description || "A structured pathway for building knowledge, confidence, and demonstrated capability."}</p><div className="flex flex-wrap gap-4 text-sm text-primary-foreground/80"><span className="inline-flex items-center gap-1"><ListChecks className="h-4 w-4" /> {modules.length} modules</span>{track.estimated_hours && <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" /> {track.estimated_hours} hours</span>}</div></div></div></section>

{adminMode && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Add module</CardTitle><CardDescription>Build a safe, ordered sequence from theory through guided practice and assessment.</CardDescription></CardHeader><CardContent><form onSubmit={addModule} className="grid gap-4 md:grid-cols-2"><div className="space-y-2 md:col-span-2"><Label htmlFor="module-title">Module title</Label><Input id="module-title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Kitchen safety and hygiene" /></div><div className="space-y-2"><Label htmlFor="module-type">Module type</Label><select id="module-type" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.module_type} onChange={(event) => setForm({ ...form, module_type: event.target.value })}><option value="lesson">Lesson</option><option value="theory">Theory</option><option value="demonstration">Demonstration</option><option value="guided_practice">Guided practice</option><option value="project">Project</option><option value="assessment">Assessment</option><option value="reflection">Reflection</option></select></div><div className="space-y-2"><Label htmlFor="module-minutes">Estimated minutes</Label><Input id="module-minutes" type="number" min="1" value={form.estimated_minutes} onChange={(event) => setForm({ ...form, estimated_minutes: event.target.value })} placeholder="Optional" /></div><div className="space-y-2 md:col-span-2"><Label htmlFor="module-description">Learning outcome</Label><Textarea id="module-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What should learners know or demonstrate after this module?" /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.safety_required} onChange={(event) => setForm({ ...form, safety_required: event.target.checked })} /> Safety prerequisite required</label><div className="md:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Adding…" : "Add module"}</Button></div></form></CardContent></Card>}

<section className="space-y-4"><div><h2 className="text-2xl font-bold">Pathway modules</h2><p className="text-muted-foreground">Each module contributes to a complete, evidence-based learning journey.</p></div>{modules.length === 0 ? <Card><CardContent className="py-12 text-center space-y-3"><BookOpen className="h-10 w-10 mx-auto text-muted-foreground" /><h3 className="text-xl font-semibold">No modules yet</h3><p className="text-muted-foreground">{adminMode ? "Add the first module above to start designing this pathway." : "Your school is still preparing this pathway."}</p></CardContent></Card> : <div className="space-y-3">{modules.map((module, index) => <Card key={module.id}><CardContent className="p-5 flex items-start gap-4"><div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{index + 1}</div><div className="flex-1 space-y-2"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{module.title}</h3><Badge variant="outline">{labelize(module.module_type)}</Badge>{module.safety_required && <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Safety first</Badge>}</div><p className="text-sm text-muted-foreground">{module.description || "Learning materials and activities will appear here."}</p>{module.estimated_minutes && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {module.estimated_minutes} minutes</p>}</div></CardContent></Card>)}</div>}</section><Card className="border-primary/20 bg-primary/5"><CardContent className="p-5 flex gap-3"><CheckCircle2 className="h-5 w-5 text-primary mt-0.5" /><div><p className="font-semibold">Designed for demonstrated capability</p><p className="text-sm text-muted-foreground mt-1">The next step connects modules to competencies, practical projects, instructor rubrics, evidence submissions, portfolios, and certificates.</p></div></CardContent></Card></main></div>;
};

export default PracticalTrackDetail;
