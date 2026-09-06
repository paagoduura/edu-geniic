import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, School, Upload, CheckCircle2, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const schoolSchema = z.object({
  name: z.string().trim().min(2, "School name is required").max(200),
  address: z.string().trim().min(5, "Address is required").max(500),
  city: z.string().trim().min(2, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(100),
  phone: z.string().trim().min(7, "Valid phone number required").max(20),
  email: z.string().trim().email("Valid email required").max(255),
  website: z.string().trim().max(255).optional(),
  registration_number: z.string().trim().min(2, "Registration number is required").max(100),
  motto: z.string().trim().max(300).optional(),
  founded_year: z.string().optional(),
  school_type: z.enum(['primary', 'secondary', 'combined']),
});

const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara'
];

const documentTypes = [
  { value: 'cac_certificate', label: 'CAC Certificate' },
  { value: 'tax_clearance', label: 'Tax Clearance Certificate' },
  { value: 'school_license', label: 'School Operating License' },
  { value: 'utility_bill', label: 'Utility Bill (Address Proof)' },
];

export default function SchoolRegistration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'info' | 'kyc' | 'done'>('info');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);

  const form = useForm<z.infer<typeof schoolSchema>>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: '', address: '', city: '', state: '', phone: '', email: '',
      website: '', registration_number: '', motto: '', founded_year: '', school_type: 'secondary',
    },
  });

  const handleSubmitSchool = async (values: z.infer<typeof schoolSchema>) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: school, error } = await supabase.from('schools').insert([{
        name: values.name,
        address: values.address,
        city: values.city,
        state: values.state,
        phone: values.phone,
        email: values.email,
        website: values.website || null,
        registration_number: values.registration_number,
        motto: values.motto || null,
        founded_year: values.founded_year ? parseInt(values.founded_year) : null,
        school_type: values.school_type,
        country: 'Nigeria',
        created_by: user.id,
      }]).select().single();

      if (error) throw error;

      // Add user as school admin
      await supabase.from('school_members').insert({
        school_id: school.id,
        user_id: user.id,
        school_role: 'admin',
      });

      // Add school_admin role
      await supabase.from('user_roles').insert({
        user_id: user.id,
        role: 'school_admin' as any,
      });

      setSchoolId(school.id);
      setStep('kyc');
      toast({ title: "School registered!", description: "Now upload your KYC documents." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocUpload = async (docType: string, file: File) => {
    if (!schoolId || !user) return;
    setUploadingDoc(docType);
    try {
      const filePath = `${schoolId}/${docType}_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('school-documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('school-documents')
        .getPublicUrl(filePath);

      await supabase.from('school_documents').insert({
        school_id: schoolId,
        document_type: docType,
        document_url: publicUrl,
        document_name: file.name,
        uploaded_by: user.id,
      });

      setUploadedDocs(prev => [...prev, docType]);
      toast({ title: "Document uploaded", description: `${file.name} uploaded successfully.` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingDoc(null);
    }
  };

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Registration Complete!</h2>
            <p className="text-muted-foreground">Your school has been registered. Documents will be auto-verified.</p>
            <Button onClick={() => navigate('/school')} className="mt-4">
              Go to School Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
            <School className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Register Your School</h1>
          <p className="text-muted-foreground">Set up your school on EduGenie's management platform</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${step === 'info' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            1. School Info
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${step === 'kyc' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            2. KYC Documents
          </div>
        </div>

        {step === 'info' && (
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Provide your school's official details</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmitSchool)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>School Name *</FormLabel>
                        <FormControl><Input placeholder="e.g. Kings College Lagos" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="school_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="primary">Primary School</SelectItem>
                            <SelectItem value="secondary">Secondary School</SelectItem>
                            <SelectItem value="combined">Combined (Primary & Secondary)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="registration_number" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number *</FormLabel>
                        <FormControl><Input placeholder="CAC/School Reg No." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address *</FormLabel>
                        <FormControl><Input placeholder="Full school address" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl><Input placeholder="e.g. Lagos" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {nigerianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl><Input placeholder="+234..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl><Input type="email" placeholder="school@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="website" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="founded_year" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Founded</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g. 1995" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="motto" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>School Motto</FormLabel>
                        <FormControl><Input placeholder="e.g. Knowledge is Power" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Registering...' : 'Continue to KYC Documents'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {step === 'kyc' && (
          <Card>
            <CardHeader>
              <CardTitle>KYC Documents</CardTitle>
              <CardDescription>Upload verification documents for record-keeping</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {documentTypes.map((doc) => (
                <div key={doc.value} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.label}</p>
                      {uploadedDocs.includes(doc.value) && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Uploaded
                        </p>
                      )}
                    </div>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocUpload(doc.value, file);
                      }}
                      disabled={uploadingDoc === doc.value}
                    />
                    <Button variant="outline" size="sm" asChild disabled={uploadingDoc === doc.value}>
                      <span className="gap-2">
                        <Upload className="w-4 h-4" />
                        {uploadingDoc === doc.value ? 'Uploading...' : uploadedDocs.includes(doc.value) ? 'Replace' : 'Upload'}
                      </span>
                    </Button>
                  </label>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Accepted formats: PDF, JPG, PNG. Documents are for record-keeping and will be auto-approved.</p>
              <Button className="w-full" onClick={() => setStep('done')}>
                {uploadedDocs.length > 0 ? 'Complete Registration' : 'Skip & Complete Later'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
