
-- Add school_admin to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'school_admin';

-- Create schools table
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Nigeria',
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  registration_number TEXT UNIQUE,
  motto TEXT,
  founded_year INTEGER,
  school_type TEXT NOT NULL DEFAULT 'secondary' CHECK (school_type IN ('primary', 'secondary', 'combined')),
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'under_review', 'verified', 'rejected')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- School documents for KYC
CREATE TABLE public.school_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('cac_certificate', 'tax_clearance', 'school_license', 'utility_bill', 'other')),
  document_url TEXT NOT NULL,
  document_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.school_documents ENABLE ROW LEVEL SECURITY;

-- School members linking users to schools
CREATE TABLE public.school_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  school_role TEXT NOT NULL DEFAULT 'student' CHECK (school_role IN ('admin', 'vice_admin', 'teacher', 'student', 'non_teaching_staff')),
  department TEXT,
  position TEXT,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, user_id)
);

ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;

-- School departments
CREATE TABLE public.school_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  head_of_department UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);

ALTER TABLE public.school_departments ENABLE ROW LEVEL SECURITY;

-- School timetable
CREATE TABLE public.school_timetable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.teacher_classes(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  teacher_id UUID,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.school_timetable ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin of a school
CREATE OR REPLACE FUNCTION public.is_school_admin(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE user_id = _user_id 
      AND school_id = _school_id 
      AND school_role IN ('admin', 'vice_admin')
      AND is_active = true
  )
$$;

-- Helper: get user's school id
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.school_members
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- ========== RLS POLICIES ==========

-- SCHOOLS
CREATE POLICY "Anyone authenticated can view verified schools"
  ON public.schools FOR SELECT TO authenticated
  USING (is_verified = true OR created_by = auth.uid() OR public.is_school_admin(auth.uid(), id));

CREATE POLICY "Authenticated users can register schools"
  ON public.schools FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "School admins can update their school"
  ON public.schools FOR UPDATE TO authenticated
  USING (public.is_school_admin(auth.uid(), id));

-- SCHOOL DOCUMENTS
CREATE POLICY "School admins can view their documents"
  ON public.school_documents FOR SELECT TO authenticated
  USING (public.is_school_admin(auth.uid(), school_id));

CREATE POLICY "School admins can upload documents"
  ON public.school_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_school_admin(auth.uid(), school_id) AND auth.uid() = uploaded_by);

CREATE POLICY "School admins can delete documents"
  ON public.school_documents FOR DELETE TO authenticated
  USING (public.is_school_admin(auth.uid(), school_id));

-- SCHOOL MEMBERS
CREATE POLICY "School admins can manage members"
  ON public.school_members FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_id))
  WITH CHECK (public.is_school_admin(auth.uid(), school_id));

CREATE POLICY "Users can view their own membership"
  ON public.school_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members can view their school members"
  ON public.school_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.school_members sm
    WHERE sm.school_id = school_members.school_id
      AND sm.user_id = auth.uid()
      AND sm.is_active = true
  ));

-- SCHOOL DEPARTMENTS
CREATE POLICY "School members can view departments"
  ON public.school_departments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.school_members
    WHERE school_members.school_id = school_departments.school_id
      AND school_members.user_id = auth.uid()
      AND school_members.is_active = true
  ));

CREATE POLICY "School admins can manage departments"
  ON public.school_departments FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_departments.school_id))
  WITH CHECK (public.is_school_admin(auth.uid(), school_departments.school_id));

-- SCHOOL TIMETABLE
CREATE POLICY "School members can view timetable"
  ON public.school_timetable FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.school_members
    WHERE school_members.school_id = school_timetable.school_id
      AND school_members.user_id = auth.uid()
      AND school_members.is_active = true
  ));

CREATE POLICY "School admins can manage timetable"
  ON public.school_timetable FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_timetable.school_id))
  WITH CHECK (public.is_school_admin(auth.uid(), school_timetable.school_id));

-- Updated_at trigger for schools
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Storage bucket for school documents
INSERT INTO storage.buckets (id, name, public) VALUES ('school-documents', 'school-documents', false);

CREATE POLICY "School admins can upload school docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'school-documents');

CREATE POLICY "School admins can view school docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'school-documents');

CREATE POLICY "School admins can delete school docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'school-documents');
