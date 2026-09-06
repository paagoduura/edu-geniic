import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Building2, CheckCircle2, ClipboardCheck, Globe2, GraduationCap, MailPlus, UploadCloud } from 'lucide-react';

type Term = { name: string; sequence_no: number; starts_on: string; ends_on: string };
type Stage = { name: string; code: string; sequence_no: number; age_min: string; age_max: string };
type Grade = { label: string; min_value: string; max_value: string; grade_point: string; description: string; sequence_no: number };
type Step = 'organization' | 'academic' | 'curriculum' | 'people' | 'verification' | 'complete';

const defaultTerms: Term[] = [
  { name: 'Term 1', sequence_no: 1, starts_on: '2026-09-01', ends_on: '2026-12-18' },
  { name: 'Term 2', sequence_no: 2, starts_on: '2027-01-11', ends_on: '2027-04-02' },
  { name: 'Term 3', sequence_no: 3, starts_on: '2027-04-19', ends_on: '2027-07-31' },
];
const defaultStages: Stage[] = [
  { name: 'Early Years', code: 'early_years', sequence_no: 1, age_min: '3', age_max: '5' },
  { name: 'Primary', code: 'primary', sequence_no: 2, age_min: '6', age_max: '11' },
  { name: 'Secondary', code: 'secondary', sequence_no: 3, age_min: '12', age_max: '18' },
];
const defaultGrades: Grade[] = [
  { label: 'A', min_value: '70', max_value: '100', grade_point: '5', description: 'Excellent', sequence_no: 1 },
  { label: 'B', min_value: '60', max_value: '69', grade_point: '4', description: 'Very good', sequence_no: 2 },
  { label: 'C', min_value: '50', max_value: '59', grade_point: '3', description: 'Good', sequence_no: 3 },
  { label: 'D', min_value: '40', max_value: '49', grade_point: '2', description: 'Pass', sequence_no: 4 },
  { label: 'F', min_value: '0', max_value: '39', grade_point: '0', description: 'Needs improvement', sequence_no: 5 },
];

const steps: Array<{ id: Step; label: string }> = [
  { id: 'organization', label: 'Organization' },
  { id: 'academic', label: 'Academic setup' },
  { id: 'curriculum', label: 'Curriculum' },
  { id: 'people', label: 'People & import' },
  { id: 'verification', label: 'Verification' },
];

const sha256 = async (value: string) => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
const randomToken = () => `${crypto.randomUUID()}-${crypto.randomUUID()}`;

export default function SchoolOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('organization');
  const [busy, setBusy] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [domainToken, setDomainToken] = useState('');
  const [domainVerified, setDomainVerified] = useState(false);
  const [importSummary, setImportSummary] = useState<{ valid: number; invalid: number } | null>(null);
  const [form, setForm] = useState({
    organization_name: '', legal_name: '', school_name: '', school_type: 'combined', address: '', city: '', state: '', country_name: 'Nigeria', country_code: 'NG', phone: '', email: '', website: '', registration_number: '', motto: '', timezone: 'Africa/Lagos', locale: 'en-NG', currency_code: 'NGN', regulatory_authority: 'State Ministry of Education', academic_year_name: '2026/2027', starts_on: '2026-09-01', ends_on: '2027-07-31', curriculum_name: 'National and school curriculum', framework_code: 'NERDC', invite_email: '', invite_role: 'teacher', domain: '',
  });
  const [terms, setTerms] = useState(defaultTerms);
  const [stages, setStages] = useState(defaultStages);
  const [grades, setGrades] = useState(defaultGrades);

  const stepIndex = Math.max(0, steps.findIndex((item) => item.id === step));
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const currentLabel = useMemo(() => steps[stepIndex]?.label ?? 'Complete', [stepIndex]);

  const createOnboarding = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const payload = { ...form, terms, learner_stages: stages.map((item) => ({ ...item, age_min: item.age_min || '', age_max: item.age_max || '' })), grading_items: grades, education_levels: ['early_years', 'primary', 'secondary', 'tertiary'] };
      const { data, error } = await (supabase as any).rpc('create_school_onboarding', { payload });
      if (error) throw error;
      setSchoolId(data.school_id);
      setStep('academic');
      toast({ title: 'Organization created', description: 'Your school foundation and academic structure are ready.' });
    } catch (error: any) {
      toast({ title: 'Onboarding could not continue', description: error.message ?? 'Please review the required fields.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const createInvite = async () => {
    if (!schoolId || !user || !form.invite_email) return;
    setBusy(true);
    try {
      const token = randomToken();
      const { error } = await (supabase as any).from('school_invites').insert({ school_id: schoolId, email: form.invite_email.trim().toLowerCase(), invite_token_hash: await sha256(token), school_role: form.invite_role, expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), invited_by: user.id });
      if (error) throw error;
      setInviteLink(`${window.location.origin}/auth?invite=${encodeURIComponent(token)}`);
      toast({ title: 'Invite created', description: 'Copy the secure invite link and send it to the staff member.' });
    } catch (error: any) { toast({ title: 'Invite failed', description: error.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const importCsv = async (file: File) => {
    if (!schoolId || !user) return;
    setBusy(true);
    try {
      const rows = (await file.text()).split(/\r?\n/).filter(Boolean);
      const headers = rows.shift()?.split(',').map((header) => header.trim().toLowerCase()) ?? [];
      const parsed = rows.map((line, index) => {
        const values = line.split(',').map((value) => value.trim());
        const payload = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? '']));
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email ?? '')) && Boolean(payload.full_name);
        return { row_number: index + 2, payload, status: valid ? 'valid' : 'invalid', errors: valid ? [] : ['full_name and a valid email are required'] };
      });
      const valid = parsed.filter((row) => row.status === 'valid').length;
      const invalid = parsed.length - valid;
      const { data: job, error: jobError } = await (supabase as any).from('school_import_jobs').insert({ school_id: schoolId, import_type: 'staff', file_name: file.name, status: 'validated', total_rows: parsed.length, valid_rows: valid, invalid_rows: invalid, error_report: parsed.filter((row) => row.status === 'invalid'), created_by: user.id }).select('id').single();
      if (jobError) throw jobError;
      const { error: rowsError } = await (supabase as any).from('school_import_rows').insert(parsed.map((row) => ({ ...row, job_id: job.id })));
      if (rowsError) throw rowsError;
      setImportSummary({ valid, invalid });
      toast({ title: 'Import validated', description: `${valid} valid rows and ${invalid} rows requiring correction.` });
    } catch (error: any) { toast({ title: 'Import failed', description: error.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const verifyDomain = async () => {
    if (!schoolId || !user || !form.domain) return;
    setBusy(true);
    try {
      const token = randomToken();
      const { error } = await (supabase as any).from('school_domains').insert({ school_id: schoolId, domain: form.domain.trim().toLowerCase(), verification_token: token, created_by: user.id });
      if (error) throw error;
      setDomainToken(token);
      const dns = await fetch(`https://dns.google/resolve?name=_edugenie.${encodeURIComponent(form.domain.trim())}&type=TXT`).then((response) => response.json());
      const verified = (dns.Answer ?? []).some((answer: { data?: string }) => String(answer.data ?? '').includes(token));
      if (verified) {
        await (supabase as any).from('school_domains').update({ status: 'verified', verified_at: new Date().toISOString() }).eq('school_id', schoolId).eq('domain', form.domain.trim().toLowerCase());
        setDomainVerified(true);
        toast({ title: 'Domain verified', description: 'School email-domain trust is active.' });
      } else toast({ title: 'DNS record not found yet', description: `Publish a TXT record at _edugenie.${form.domain} with the displayed token, then verify again.` });
    } catch (error: any) { toast({ title: 'Domain verification failed', description: error.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const finish = async () => {
    if (schoolId) await (supabase as any).from('schools').update({ onboarding_status: 'complete', onboarding_step: 6 }).eq('id', schoolId);
    setStep('complete');
  };

  if (step === 'complete') return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4"><Card className="max-w-lg text-center"><CardContent className="space-y-4 pt-10"><CheckCircle2 className="mx-auto h-16 w-16 text-green-600" /><h1 className="text-2xl font-bold">School onboarding complete</h1><p className="text-muted-foreground">Your organization, academic calendar, curriculum foundation, people workflows, and verification settings are ready.</p><Button onClick={() => navigate('/school')}>Open school workspace</Button></CardContent></Card></div>;

  return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4"><div className="mx-auto max-w-5xl space-y-6"><Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2"><ArrowLeft className="h-4 w-4" /> Dashboard</Button><div><Badge variant="secondary">Step {stepIndex + 1} of {steps.length}</Badge><h1 className="mt-2 text-3xl font-bold">Set up your school workspace</h1><p className="text-muted-foreground">A guided setup for international-ready school operations.</p></div><div className="grid gap-2 md:grid-cols-5">{steps.map((item, index) => <div key={item.id} className={`rounded-lg border p-3 text-sm ${index <= stepIndex ? 'border-primary bg-primary/5' : 'bg-card'}`}><span className="font-semibold">{index + 1}. {item.label}</span></div>)}</div>

    {step === 'organization' && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Organization and school profile</CardTitle><CardDescription>Configure the legal, regional, contact, and regulatory identity of your institution.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{[['organization_name','Organization name'],['legal_name','Legal name'],['school_name','School name'],['registration_number','Registration number'],['address','Address'],['city','City'],['state','State / province'],['phone','Phone'],['email','Official email'],['website','Website'],['motto','Motto'],['regulatory_authority','Regulatory authority']].map(([key, label]) => <label key={key} className="space-y-1 text-sm"><span className="font-medium">{label}</span><Input value={(form as any)[key]} onChange={(event) => update(key, event.target.value)} /></label>)}<label className="space-y-1 text-sm"><span className="font-medium">School type</span><Select value={form.school_type} onValueChange={(value) => update('school_type', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="primary">Primary</SelectItem><SelectItem value="secondary">Secondary</SelectItem><SelectItem value="combined">Combined</SelectItem></SelectContent></Select></label><label className="space-y-1 text-sm"><span className="font-medium">Timezone</span><Input value={form.timezone} onChange={(event) => update('timezone', event.target.value)} placeholder="Africa/Lagos" /></label><label className="space-y-1 text-sm"><span className="font-medium">Locale</span><Input value={form.locale} onChange={(event) => update('locale', event.target.value)} placeholder="en-NG" /></label><label className="space-y-1 text-sm"><span className="font-medium">Currency</span><Input value={form.currency_code} onChange={(event) => update('currency_code', event.target.value.toUpperCase())} placeholder="NGN" /></label><Button className="md:col-span-2" onClick={createOnboarding} disabled={busy || !form.organization_name || !form.school_name}>{busy ? 'Creating workspace…' : 'Create organization and continue'}</Button></CardContent></Card>}

    {step === 'academic' && <Card><CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Academic year and terms</CardTitle><CardDescription>Set the institution calendar used by classes, assessments, reports, and attendance.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><label className="space-y-1 text-sm"><span>Academic year</span><Input value={form.academic_year_name} onChange={(event) => update('academic_year_name', event.target.value)} /></label><label className="space-y-1 text-sm"><span>Starts</span><Input type="date" value={form.starts_on} onChange={(event) => update('starts_on', event.target.value)} /></label><label className="space-y-1 text-sm"><span>Ends</span><Input type="date" value={form.ends_on} onChange={(event) => update('ends_on', event.target.value)} /></label></div>{terms.map((term, index) => <div key={term.sequence_no} className="grid gap-3 rounded-lg border p-3 md:grid-cols-4"><Input value={term.name} onChange={(event) => setTerms((all) => all.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /><Input type="date" value={term.starts_on} onChange={(event) => setTerms((all) => all.map((item, i) => i === index ? { ...item, starts_on: event.target.value } : item))} /><Input type="date" value={term.ends_on} onChange={(event) => setTerms((all) => all.map((item, i) => i === index ? { ...item, ends_on: event.target.value } : item))} /><Badge variant="outline" className="justify-center">Term {term.sequence_no}</Badge></div>)}<Button onClick={() => setStep('curriculum')}>Continue to curriculum</Button></CardContent></Card>}

    {step === 'curriculum' && <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /> Curriculum, grading, and learner stages</CardTitle><CardDescription>Configure the framework and progression model that powers reporting and competency-based learning.</CardDescription></CardHeader><CardContent className="space-y-5"><label className="space-y-1 text-sm"><span>Curriculum name</span><Input value={form.curriculum_name} onChange={(event) => update('curriculum_name', event.target.value)} /></label><label className="space-y-1 text-sm"><span>Framework code</span><Input value={form.framework_code} onChange={(event) => update('framework_code', event.target.value)} placeholder="NERDC, IB, Cambridge, custom" /></label><div><h3 className="mb-2 font-semibold">Learner stages</h3>{stages.map((stage, index) => <div key={stage.code} className="mb-2 grid gap-2 md:grid-cols-5"><Input value={stage.name} onChange={(event) => setStages((all) => all.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /><Input value={stage.code} onChange={(event) => setStages((all) => all.map((item, i) => i === index ? { ...item, code: event.target.value } : item))} /><Input type="number" value={stage.age_min} onChange={(event) => setStages((all) => all.map((item, i) => i === index ? { ...item, age_min: event.target.value } : item))} placeholder="Min age" /><Input type="number" value={stage.age_max} onChange={(event) => setStages((all) => all.map((item, i) => i === index ? { ...item, age_max: event.target.value } : item))} placeholder="Max age" /><Badge variant="outline">Stage {stage.sequence_no}</Badge></div>)}</div><div><h3 className="mb-2 font-semibold">Grading scale</h3>{grades.map((grade, index) => <div key={grade.label} className="mb-2 grid gap-2 md:grid-cols-5"><Input value={grade.label} onChange={(event) => setGrades((all) => all.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} /><Input type="number" value={grade.min_value} onChange={(event) => setGrades((all) => all.map((item, i) => i === index ? { ...item, min_value: event.target.value } : item))} /><Input type="number" value={grade.max_value} onChange={(event) => setGrades((all) => all.map((item, i) => i === index ? { ...item, max_value: event.target.value } : item))} /><Input value={grade.description} onChange={(event) => setGrades((all) => all.map((item, i) => i === index ? { ...item, description: event.target.value } : item))} /><Badge variant="outline">Grade</Badge></div>)}</div><Button onClick={() => setStep('people')}>Save curriculum setup</Button></CardContent></Card>}

    {step === 'people' && <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><MailPlus className="h-5 w-5 text-primary" /> Invite staff and families</CardTitle><CardDescription>Invite people by verified email with a least-privilege school role.</CardDescription></CardHeader><CardContent className="space-y-4"><Input type="email" placeholder="person@school.org" value={form.invite_email} onChange={(event) => update('invite_email', event.target.value)} /><Select value={form.invite_role} onValueChange={(value) => update('invite_role', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['admin','vice_admin','teacher','instructor','student','parent','non_teaching_staff'].map((role) => <SelectItem key={role} value={role}>{role.replace('_', ' ')}</SelectItem>)}</SelectContent></Select><Button onClick={createInvite} disabled={busy || !form.invite_email}>Create secure invite</Button>{inviteLink && <div className="rounded-lg bg-muted p-3 text-xs break-all">{inviteLink}</div>}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><UploadCloud className="h-5 w-5 text-primary" /> Bulk import</CardTitle><CardDescription>Upload CSV with `full_name,email` columns. Rows are validated before any processing.</CardDescription></CardHeader><CardContent className="space-y-4"><Input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); }} disabled={busy} />{importSummary && <p className="text-sm">Validated: <strong>{importSummary.valid}</strong> valid, <strong>{importSummary.invalid}</strong> requiring correction.</p>}</CardContent></Card><Card className="lg:col-span-2"><CardHeader><CardTitle>Continue to verification</CardTitle></CardHeader><CardContent><Button onClick={() => setStep('verification')}>Configure domain verification</Button></CardContent></Card></div>}

    {step === 'verification' && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-primary" /> Domain verification</CardTitle><CardDescription>Verify a school-owned domain before enabling trusted school-email invitations.</CardDescription></CardHeader><CardContent className="space-y-4"><Input placeholder="school.org" value={form.domain} onChange={(event) => update('domain', event.target.value)} /><p className="text-sm text-muted-foreground">We will check a TXT record at <code>_edugenie.{form.domain || 'school.org'}</code>.</p><Button onClick={verifyDomain} disabled={busy || !form.domain || domainVerified}>{domainVerified ? 'Domain verified' : 'Generate and check DNS record'}</Button>{domainToken && !domainVerified && <div className="rounded-lg border p-4 text-sm"><p>Add this TXT value at <code>_edugenie.{form.domain}</code>:</p><code className="mt-2 block break-all">{domainToken}</code><p className="mt-2 text-muted-foreground">DNS propagation can take several minutes. Run verification again after publishing the record.</p></div>}<Button variant="outline" onClick={finish}>Finish onboarding</Button></CardContent></Card>}

    <p className="text-center text-xs text-muted-foreground">Current stage: {currentLabel}. You can complete verification later without losing the school foundation.</p></div></div>;
}
