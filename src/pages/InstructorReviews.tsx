import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleAlert, ClipboardCheck, MessageSquare, Save, Star, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Submission { id: string; project_id: string; learner_id: string; submission_text: string | null; evidence: Array<{ name: string; path: string }>; status: string; submitted_at: string | null; }
interface Project { id: string; title: string; school_id: string; }
interface Competency { id: string; name: string; }
interface ReviewDraft { score: string; feedback: string; decision: "approved" | "needs_revision" | "rejected"; competency_id: string; level: "introduced" | "practising" | "competent" | "mastered"; }

const decisionLabels = { approved: "Approve", needs_revision: "Request revision", rejected: "Reject" };

const InstructorReviews = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: membership } = await supabase.from("school_members").select("school_id").eq("user_id", user.id).eq("is_active", true).in("school_role", ["admin", "vice_admin", "teacher", "instructor"]).limit(1).maybeSingle();
    if (!membership?.school_id) { setError("You need an active instructor or administrator membership to review work."); setLoading(false); return; }
    setSchoolId(membership.school_id);
    const [{ data: submissionData, error: submissionError }, { data: projectData }, { data: competencyData }] = await Promise.all([
      supabase.from("practical_submissions" as never).select("id, project_id, learner_id, submission_text, evidence, status, submitted_at").eq("school_id", membership.school_id).in("status", ["submitted", "under_review", "needs_revision"]).order("submitted_at", { ascending: true }),
      supabase.from("practical_projects" as never).select("id, title, school_id").eq("school_id", membership.school_id),
      supabase.from("competencies" as never).select("id, name").order("name"),
    ]);
    if (submissionError) setError("Unable to load the review queue.");
    setSubmissions((submissionData || []) as Submission[]);
    setProjects((projectData || []) as Project[]);
    setCompetencies((competencyData || []) as Competency[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const getDraft = (id: string): ReviewDraft => drafts[id] || { score: "", feedback: "", decision: "approved", competency_id: "", level: "competent" };
  const updateDraft = (id: string, patch: Partial<ReviewDraft>) => setDrafts((current) => ({ ...current, [id]: { ...getDraft(id), ...patch } }));
  const projectTitle = (id: string) => projects.find((project) => project.id === id)?.title || "Practical project";

  const saveReview = async (submission: Submission) => {
    if (!user || !schoolId) return;
    const draft = getDraft(submission.id);
    if (!draft.feedback.trim()) { toast({ title: "Feedback required", description: "Give the learner actionable feedback before saving the review.", variant: "destructive" }); return; }
    setSavingId(submission.id);
    const { error: reviewError } = await supabase.from("instructor_reviews" as never).insert({ submission_id: submission.id, school_id: schoolId, instructor_id: user.id, overall_score: draft.score ? Number(draft.score) : null, feedback: draft.feedback.trim(), decision: draft.decision, rubric_scores: {} } as never);
    if (!reviewError) await supabase.from("practical_submissions" as never).update({ status: draft.decision, reviewed_at: new Date().toISOString() } as never).eq("id", submission.id);
    if (!reviewError && draft.competency_id) {
      await supabase.from("learner_competency_progress" as never).upsert({ school_id: schoolId, learner_id: submission.learner_id, competency_id: draft.competency_id, level: draft.level, evidence_count: submission.evidence?.length || 0, last_assessed_at: new Date().toISOString(), assessed_by: user.id, assessor_notes: draft.feedback.trim() } as never);
    }
    setSavingId(null);
    if (reviewError) { toast({ title: "Could not save review", description: reviewError.message, variant: "destructive" }); return; }
    toast({ title: "Review saved", description: "The learner's submission and competency record have been updated." });
    await load();
  };

  return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5"><header className="border-b bg-card/80 sticky top-0 z-10"><div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between"><Button variant="ghost" className="gap-2" onClick={() => navigate("/school")}><ArrowLeft className="h-4 w-4" /> School dashboard</Button><Badge variant="outline" className="gap-2"><ClipboardCheck className="h-4 w-4" /> Instructor review queue</Badge></div></header><main className="max-w-6xl mx-auto px-4 py-8 space-y-6"><section><h1 className="text-3xl font-bold">Review learner evidence</h1><p className="text-muted-foreground mt-2">Assess demonstrated work with consistent decisions, feedback, and competency progression.</p></section>{loading ? <Card className="h-48 animate-pulse bg-muted/40" /> : error ? <Card><CardContent className="py-10 text-center"><CircleAlert className="h-10 w-10 mx-auto text-destructive mb-3" /><p>{error}</p></CardContent></Card> : submissions.length === 0 ? <Card><CardContent className="py-12 text-center space-y-3"><CheckCircle2 className="h-10 w-10 mx-auto text-primary" /><h2 className="text-xl font-semibold">Review queue is clear</h2><p className="text-muted-foreground">New learner submissions will appear here when they are ready for assessment.</p></CardContent></Card> : <div className="space-y-5">{submissions.map((submission) => { const draft = getDraft(submission.id); return <Card key={submission.id}><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{projectTitle(submission.project_id)}</CardTitle><CardDescription>Learner ID: {submission.learner_id.slice(0, 8)} · Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "recently"}</CardDescription></div><Badge variant={submission.status === "needs_revision" ? "secondary" : "default"}>{submission.status.replace(/_/g, " ")}</Badge></div></CardHeader><CardContent className="space-y-5"><div className="rounded-lg bg-muted/50 p-4"><p className="text-sm font-medium mb-2">Learner reflection</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{submission.submission_text || "No written reflection provided."}</p><p className="text-xs text-muted-foreground mt-3">{submission.evidence?.length || 0} evidence file(s) submitted</p></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor={`score-${submission.id}`}>Overall score (0–100)</Label><Input id={`score-${submission.id}`} type="number" min="0" max="100" value={draft.score} onChange={(event) => updateDraft(submission.id, { score: event.target.value })} /></div><div className="space-y-2"><Label htmlFor={`decision-${submission.id}`}>Decision</Label><select id={`decision-${submission.id}`} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.decision} onChange={(event) => updateDraft(submission.id, { decision: event.target.value as ReviewDraft["decision"] })}>{Object.entries(decisionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="space-y-2"><Label htmlFor={`competency-${submission.id}`}>Competency assessed</Label><select id={`competency-${submission.id}`} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.competency_id} onChange={(event) => updateDraft(submission.id, { competency_id: event.target.value })}><option value="">Do not update competency</option>{competencies.map((competency) => <option key={competency.id} value={competency.id}>{competency.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor={`level-${submission.id}`}>Demonstrated level</Label><select id={`level-${submission.id}`} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.level} onChange={(event) => updateDraft(submission.id, { level: event.target.value as ReviewDraft["level"] })}><option value="introduced">Introduced</option><option value="practising">Practising</option><option value="competent">Competent</option><option value="mastered">Mastered</option></select></div></div><div className="space-y-2"><Label htmlFor={`feedback-${submission.id}`} className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Actionable feedback</Label><Textarea id={`feedback-${submission.id}`} value={draft.feedback} onChange={(event) => updateDraft(submission.id, { feedback: event.target.value })} placeholder="Describe strengths, specific improvements, and the next step." className="min-h-28" /></div><Button onClick={() => void saveReview(submission)} disabled={savingId === submission.id} className="gap-2"><Save className="h-4 w-4" />{savingId === submission.id ? "Saving…" : "Save review"}</Button>{draft.decision === "approved" ? <span className="ml-3 text-sm text-primary inline-flex items-center gap-1"><Star className="h-4 w-4" /> Competency can be awarded when selected</span> : draft.decision === "rejected" ? <span className="ml-3 text-sm text-destructive inline-flex items-center gap-1"><XCircle className="h-4 w-4" /> Learner will need a new attempt</span> : null}</CardContent></Card>; })}</div>}</main></div>;
};
export default InstructorReviews;
