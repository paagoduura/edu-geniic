import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings, Upload, FileText, CheckCircle2, School, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const documentTypes = [
  { value: 'cac_certificate', label: 'CAC Certificate' },
  { value: 'tax_clearance', label: 'Tax Clearance Certificate' },
  { value: 'school_license', label: 'School Operating License' },
  { value: 'utility_bill', label: 'Utility Bill (Address Proof)' },
];

export default function SchoolSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [school, setSchool] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const { data: membership } = await supabase
      .from('school_members').select('school_id')
      .eq('user_id', user.id).eq('is_active', true)
      .in('school_role', ['admin', 'vice_admin']).maybeSingle();

    if (!membership) { setLoading(false); return; }

    const { data: schoolData } = await supabase.from('schools').select('*').eq('id', membership.school_id).single();
    const { data: docsData } = await supabase.from('school_documents').select('*').eq('school_id', membership.school_id);

    setSchool(schoolData);
    setFormData(schoolData || {});
    setDocs(docsData || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!school) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('schools').update({
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        motto: formData.motto,
      }).eq('id', school.id);
      if (error) throw error;
      toast({ title: "Saved", description: "School details updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDocUpload = async (docType: string, file: File) => {
    if (!school || !user) return;
    setUploadingDoc(docType);
    try {
      const filePath = `${school.id}/${docType}_${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('school-documents').upload(filePath, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('school-documents').getPublicUrl(filePath);
      await supabase.from('school_documents').insert({
        school_id: school.id, document_type: docType,
        document_url: publicUrl, document_name: file.name, uploaded_by: user.id,
      });
      toast({ title: "Uploaded" });
      fetchData();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally { setUploadingDoc(null); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  if (!school) {
    return <div className="min-h-screen flex items-center justify-center p-4"><p>No school found.</p></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/school')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> School Dashboard
        </Button>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" /> School Settings
          </h1>
        </div>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              School Profile
              <Badge variant={school.is_verified ? 'default' : 'secondary'}>
                {school.is_verified ? 'Verified' : school.verification_status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['name', 'address', 'city', 'state', 'phone', 'email', 'website', 'motto'] as const).map(field => (
                <div key={field}>
                  <label className="text-sm font-medium capitalize">{field}</label>
                  <Input value={formData[field] || ''} onChange={e => setFormData({ ...formData, [field]: e.target.value })} />
                </div>
              ))}
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* KYC Documents */}
        <Card>
          <CardHeader>
            <CardTitle>KYC Documents</CardTitle>
            <CardDescription>Manage verification documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {documentTypes.map(doc => {
              const uploaded = docs.find(d => d.document_type === doc.value);
              return (
                <div key={doc.value} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.label}</p>
                      {uploaded && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {uploaded.document_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(doc.value, f); }}
                      disabled={uploadingDoc === doc.value} />
                    <Button variant="outline" size="sm" asChild>
                      <span className="gap-2">
                        <Upload className="w-4 h-4" />
                        {uploadingDoc === doc.value ? 'Uploading...' : uploaded ? 'Replace' : 'Upload'}
                      </span>
                    </Button>
                  </label>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
