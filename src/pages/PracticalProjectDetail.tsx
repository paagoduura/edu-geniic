import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CircleAlert, FileUp, ShieldCheck, UploadCloud } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MAX_EVIDENCE_BYTES, validateEvidenceFile } from "@/lib/evidence";

interface Project { id: string; school_id: string; title: string; instructions: string; safety_instructions: string | null; due_at: string | null; status: string; }
interface Submission { id: string; submission_text: string | null; evidence: Array<{ name: string; path: string; type: string; size: number }>; status: string; }

const PracticalProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId || !user) return;
    const { data: projectData, error: projectError } = await supabase.from("practical_projects" as never).select("id, school_id, title, instructions, safety_instructions, due_at, status").eq("id", projectId).maybeSingle();
    if (projectError || !projectData) { setError("This project is not available."); setLoading(false); return; }
    const { data: submissionData } = await supabase.from("practical_submissions" as never).select("id, submission_text, evidence, status").eq("project_id", projectId).eq("learner_id", user.id).maybeSingle();
    setProject(projectData as Project);
    if (submissionData) { const value = submissionData as Submission; setSubmission(value); setText(value.submission_text || ""); }
    setLoading(false);
  }, [projectId, user]);
  useEffect(() => { void load(); }, [load]);

  const submitEvidence = async () => {
    if (!project || !projectId || !user || (!text.trim() && files.length === 0)) return;
    setSaving(true);
    const submissionId = submission?.id || crypto.randomUUID();
    const evidence = [...(submission?.evidence || [])];
    for (const file of files) {
      const validation = validateEvidenceFile(file);
      if (!validation.valid) {
        toast({ title: "Upload blocked", description: validation.reason, variant: "destructive" });
        setSaving(false);
        return;
      }
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
      const path = `${project.school_id}/${user.id}/${submissionId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("practical-evidence").upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) { toast({ title: "Upload blocked", description: uploadError.message, variant: "destructive" }); setSaving(false); return; }
      evidence.push({ name: file.name, path, type: file.type, size: file.size });
    }
    const payload = { id: submissionId, project_id: projectId, school_id: project.school_id, learner_id: user.id, submission_text: text.trim() || null, evidence, status: "submitted", submitted_at: new Date().toISOString() };
    const { error: saveError } = submission ? await supabase.from("practical_submissions" as never).update(payload as never).eq("id", submission.id) : await supabase.from("practical_submissions" as never).insert(payload as never);
    setSaving(false);
    if (saveError) { toast({ title: "Could not save submission", description: saveError.message, variant: "destructive" }); return; }
    toast({ title: "Evidence submitted", description: "Your instructor can now review this work." });
    setFiles([]);
    await load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  if (error || !project) return <div className="min-h-screen flex items-center justify-center p-4"><Card><CardContent className="py-8 text-center space-y-3"><CircleAlert className="h-10 w-10 mx-auto text-destructive" /><p>{error}</p><Button onClick={() => navigate("/practical-projects")}>Back to projects</Button></CardContent></Card></div>;

  const handleFiles = (selectedFiles: File[]) => {
    const accepted: File[] = [];
    for (const file of selectedFiles) {
      const validation = validateEvidenceFile(file);
      if (validation.valid) accepted.push(file);
      else toast({ title: "File skipped", description: validation.reason, variant: "destructive" });
    }
    setFiles(accepted);
  };

  return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5"><header className="border-b bg-card/80 sticky top-0 z-10"><div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between"><Button variant="ghost" className="gap-2" onClick={() => navigate("/practical-projects")}><ArrowLeft className="h-4 w-4" /> Projects</Button><Link to="/" className="font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">EduGenie</Link></div></header><main className="max-w-4xl mx-auto px-4 py-8 space-y-6"><Card><CardHeader><div className="flex flex-wrap items-center gap-2"><Badge>Practical project</Badge>{project.due_at && <Badge variant="outline">Due {new Date(project.due_at).toLocaleDateString()}</Badge>}</div><CardTitle className="text-3xl pt-2">{project.title}</CardTitle><CardDescription className="whitespace-pre-wrap">{project.instructions}</CardDescription></CardHeader>{project.safety_instructions && <CardContent className="pt-0"><div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 flex gap-3"><ShieldCheck className="h-5 w-5 text-amber-600 mt-0.5" /><div><p className="font-semibold text-amber-700 dark:text-amber-400">Safety guidance</p><p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{project.safety_instructions}</p></div></div></CardContent>}</Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><UploadCloud className="h-5 w-5 text-primary" /> Submit your evidence</CardTitle><CardDescription>Explain what you did and upload supporting photos, audio, video, documents, or code files. Maximum file size is {Math.round(MAX_EVIDENCE_BYTES / 1024 / 1024)} MB per file.</CardDescription></CardHeader><CardContent className="space-y-5"><Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Describe your process, decisions, challenges, and what you learned." className="min-h-36" /><label className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors"><FileUp className="h-8 w-8 text-muted-foreground" /><span className="font-medium">Choose evidence files</span><span className="text-xs text-muted-foreground">Images, audio, video, PDF, text, or ZIP</span><input type="file" multiple className="sr-only" accept="image/*,audio/*,video/mp4,application/pdf,text/plain,application/zip" onChange={(event) => handleFiles(Array.from(event.target.files || []))} /></label>{files.length > 0 && <div className="space-y-2">{files.map((file) => <div key={`${file.name}-${file.size}`} className="text-sm flex items-center justify-between rounded-md bg-muted p-2"><span className="truncate">{file.name}</span><span className="text-muted-foreground">{Math.round(file.size / 1024)} KB</span></div>)}</div>}{submission && <p className="text-sm text-muted-foreground">Current status: <span className="font-medium capitalize">{submission.status.replace(/_/g, " ")}</span></p>}<Button onClick={() => void submitEvidence()} disabled={saving || (!text.trim() && files.length === 0)} className="w-full">{saving ? "Uploading and submitting…" : submission ? "Update submission" : "Submit evidence"}</Button></CardContent></Card><Card className="border-primary/20 bg-primary/5"><CardContent className="p-5 flex gap-3"><CheckCircle2 className="h-5 w-5 text-primary mt-0.5" /><p className="text-sm text-muted-foreground">Your evidence is private to you and authorised instructors at your school. Instructor feedback and competency results will appear here when reviewed.</p></CardContent></Card></main></div>;
};
export default PracticalProjectDetail;
