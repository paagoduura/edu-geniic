import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, Clock3, Plus, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Track { id: string; title: string; }
interface Project { id: string; track_id: string; title: string; instructions: string; safety_instructions: string | null; status: string; due_at: string | null; }
const labelize = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

const PracticalProjects = ({ adminMode = false }: { adminMode?: boolean }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ track_id: "", title: "", instructions: "", safety_instructions: "", due_at: "" });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: membership } = await supabase.from("school_members").select("school_id").eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
    if (!membership?.school_id) { setLoading(false); return; }
    setSchoolId(membership.school_id);
    const trackQuery = supabase.from("learning_tracks" as never).select("id, title").eq("school_id", membership.school_id).order("title");
    const projectQuery = supabase.from("practical_projects" as never).select("id, track_id, title, instructions, safety_instructions, status, due_at").eq("school_id", membership.school_id).order("created_at", { ascending: false });
    const [{ data: trackData }, { data: projectData }] = await Promise.all([trackQuery, adminMode ? projectQuery : projectQuery.eq("status", "published")]);
    setTracks((trackData || []) as Track[]);
    setProjects((projectData || []) as Project[]);
    setLoading(false);
  }, [adminMode, user]);

  useEffect(() => { void load(); }, [load]);

  const createProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !schoolId || !form.track_id || !form.title.trim() || !form.instructions.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("practical_projects" as never).insert({ school_id: schoolId, track_id: form.track_id, title: form.title.trim(), instructions: form.instructions.trim(), safety_instructions: form.safety_instructions.trim() || null, due_at: form.due_at || null, status: "draft", created_by: user.id } as never);
    setSaving(false);
    if (error) { toast({ title: "Could not create project", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Project created", description: "The project is saved as a draft for review." });
    setForm({ track_id: "", title: "", instructions: "", safety_instructions: "", due_at: "" });
    await load();
  };

  const trackTitle = (id: string) => tracks.find((track) => track.id === id)?.title || "Learning pathway";
  return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5"><header className="border-b bg-card/80 sticky top-0 z-10"><div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between"><Button variant="ghost" className="gap-2" onClick={() => navigate(adminMode ? "/school" : "/dashboard")}><ArrowLeft className="h-4 w-4" /> Back</Button><Link to="/" className="font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">EduGenie</Link></div></header><main className="max-w-6xl mx-auto px-4 py-8 space-y-8"><section className="rounded-2xl bg-gradient-to-r from-secondary to-primary text-primary-foreground p-6 md:p-8"><div className="flex items-start gap-4"><div className="rounded-xl bg-white/15 p-3"><ClipboardCheck className="h-7 w-7" /></div><div><Badge variant="secondary">Evidence-based assessment</Badge><h1 className="text-3xl font-bold mt-3">Practical projects</h1><p className="text-primary-foreground/85 mt-2 max-w-2xl">Turn learning into demonstrable work through safe, structured projects assessed by instructors.</p></div></div></section>
{adminMode && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Author a practical project</CardTitle><CardDescription>Projects should describe observable outcomes and include safety guidance where relevant.</CardDescription></CardHeader><CardContent><form onSubmit={createProject} className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="project-track">Learning track</Label><select id="project-track" required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.track_id} onChange={(event) => setForm({ ...form, track_id: event.target.value })}><option value="">Select a track</option>{tracks.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}</select></div><div className="space-y-2"><Label htmlFor="project-due">Due date</Label><Input id="project-due" type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} /></div><div className="space-y-2 md:col-span-2"><Label htmlFor="project-title">Project title</Label><Input id="project-title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Prepare and present a balanced three-course meal" /></div><div className="space-y-2 md:col-span-2"><Label htmlFor="project-instructions">Instructions and success criteria</Label><Textarea id="project-instructions" required value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Explain what learners must do and what successful work demonstrates." /></div><div className="space-y-2 md:col-span-2"><Label htmlFor="project-safety">Safety guidance</Label><Textarea id="project-safety" value={form.safety_instructions} onChange={(event) => setForm({ ...form, safety_instructions: event.target.value })} placeholder="List tools, supervision, hygiene, safeguarding, or safety requirements." /></div><div className="md:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create draft project"}</Button></div></form></CardContent></Card>}
<section className="space-y-4"><div><h2 className="text-2xl font-bold">{adminMode ? "Project library" : "Projects to complete"}</h2><p className="text-muted-foreground">{adminMode ? "Review and publish projects for your learners." : "Submit evidence and receive instructor feedback."}</p></div>{loading ? <div className="grid gap-4 md:grid-cols-2"><Card className="h-40 animate-pulse bg-muted/40" /><Card className="h-40 animate-pulse bg-muted/40" /></div> : projects.length === 0 ? <Card><CardContent className="py-12 text-center"><ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="font-medium">No practical projects available yet</p><p className="text-sm text-muted-foreground mt-1">{adminMode ? "Create the first project above." : "Your instructors will publish projects here."}</p></CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{projects.map((project) => <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`${adminMode ? "/school/practical-projects" : "/practical-projects"}/${project.id}`)}><CardHeader><div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-primary/10 p-3"><Wrench className="h-5 w-5 text-primary" /></div><Badge variant={project.status === "published" ? "default" : "secondary"}>{labelize(project.status)}</Badge></div><CardTitle className="pt-2">{project.title}</CardTitle><CardDescription>{trackTitle(project.track_id)}</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground line-clamp-3">{project.instructions}</p><div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">{project.safety_instructions && <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Safety guidance included</span>}{project.due_at && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Due {new Date(project.due_at).toLocaleDateString()}</span>}</div></CardContent></Card>)}</div>}</section></main></div>;
};
export default PracticalProjects;
