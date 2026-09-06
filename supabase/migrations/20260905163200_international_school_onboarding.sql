-- EduGenie international school onboarding foundation.
-- The migration is additive and safe for existing schools.

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 200),
  legal_name TEXT,
  country_code TEXT NOT NULL DEFAULT 'NG' CHECK (country_code ~ '^[A-Z]{2}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'archived')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  organization_role TEXT NOT NULL CHECK (organization_role IN ('owner', 'admin', 'member')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'NG';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Lagos';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en-NG';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'NGN';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS regulatory_authority TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS education_levels TEXT[] NOT NULL DEFAULT ARRAY['secondary'];
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'profile' CHECK (onboarding_status IN ('profile', 'academic_structure', 'curriculum', 'people', 'verification', 'complete', 'suspended'));
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 1 CHECK (onboarding_step BETWEEN 1 AND 6);
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS primary_domain TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS domain_verification_status TEXT NOT NULL DEFAULT 'not_started' CHECK (domain_verification_status IN ('not_started', 'pending', 'verified', 'failed'));

-- Existing deployments used a narrower role check. Extend it for ownership and practical instructors.
ALTER TABLE public.school_members DROP CONSTRAINT IF EXISTS school_members_school_role_check;
ALTER TABLE public.school_members ADD CONSTRAINT school_members_school_role_check CHECK (school_role IN ('owner', 'admin', 'vice_admin', 'teacher', 'instructor', 'student', 'parent', 'non_teaching_staff'));

CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'closed')),
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on > starts_on),
  UNIQUE (school_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS academic_years_one_current_per_school ON public.academic_years(school_id) WHERE is_current;

CREATE TABLE IF NOT EXISTS public.academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  sequence_no INTEGER NOT NULL CHECK (sequence_no BETWEEN 1 AND 12),
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on > starts_on),
  UNIQUE (academic_year_id, sequence_no),
  UNIQUE (academic_year_id, name)
);

CREATE TABLE IF NOT EXISTS public.grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  scale_type TEXT NOT NULL DEFAULT 'percentage' CHECK (scale_type IN ('percentage', 'points', 'letter', 'competency')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS grading_scales_one_default_per_school ON public.grading_scales(school_id) WHERE is_default;

CREATE TABLE IF NOT EXISTS public.grading_scale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_scale_id UUID NOT NULL REFERENCES public.grading_scales(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  min_value NUMERIC(8,2) NOT NULL,
  max_value NUMERIC(8,2) NOT NULL,
  grade_point NUMERIC(5,2),
  description TEXT,
  sequence_no INTEGER NOT NULL DEFAULT 1,
  CHECK (max_value >= min_value),
  UNIQUE (grading_scale_id, label)
);

CREATE TABLE IF NOT EXISTS public.learner_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  code TEXT NOT NULL CHECK (code ~ '^[a-z0-9_\-]+$'),
  sequence_no INTEGER NOT NULL CHECK (sequence_no > 0),
  age_min INTEGER CHECK (age_min IS NULL OR age_min BETWEEN 2 AND 100),
  age_max INTEGER CHECK (age_max IS NULL OR age_max BETWEEN 2 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, code),
  UNIQUE (school_id, sequence_no),
  CHECK (age_max IS NULL OR age_min IS NULL OR age_max >= age_min)
);

CREATE TABLE IF NOT EXISTS public.school_curricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  framework_code TEXT NOT NULL DEFAULT 'custom',
  country_code TEXT NOT NULL DEFAULT 'NG',
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'published', 'archived')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, name, version)
);

CREATE TABLE IF NOT EXISTS public.school_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  email TEXT,
  invite_token_hash TEXT NOT NULL UNIQUE,
  school_role TEXT NOT NULL CHECK (school_role IN ('admin', 'vice_admin', 'teacher', 'instructor', 'student', 'parent', 'non_teaching_staff')),
  department_id UUID REFERENCES public.school_departments(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  invited_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email IS NULL OR email = lower(email)),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS school_invites_email_idx ON public.school_invites(school_id, email) WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.school_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  verification_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'revoked')),
  verified_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, domain)
);

CREATE TABLE IF NOT EXISTS public.school_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL CHECK (import_type IN ('students', 'staff', 'parents')),
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'validating', 'validated', 'processing', 'completed', 'failed', 'cancelled')),
  total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  valid_rows INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
  invalid_rows INTEGER NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
  error_report JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.school_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.school_import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number > 0),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'valid', 'invalid', 'processed', 'skipped')),
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (job_id, row_number)
);

-- Shared authorization helpers.
CREATE OR REPLACE FUNCTION public.is_school_admin(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE user_id = _user_id AND school_id = _school_id
      AND school_role IN ('owner', 'admin', 'vice_admin') AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_school_staff(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE user_id = _user_id AND school_id = _school_id
      AND school_role IN ('owner', 'admin', 'vice_admin', 'teacher', 'instructor') AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_school_owner(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE user_id = _user_id AND school_id = _school_id
      AND school_role = 'owner' AND is_active = true
  )
$$;

-- RLS for new tenant-scoped tables.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_import_rows ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.organization_member(_user_id UUID, _organization_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND organization_id = _organization_id AND is_active)
$$;

DROP POLICY IF EXISTS "Organization members can view organization" ON public.organizations;
CREATE POLICY "Organization members can view organization" ON public.organizations FOR SELECT TO authenticated USING (public.organization_member(auth.uid(), id));
DROP POLICY IF EXISTS "Organization owners can update organization" ON public.organizations;
CREATE POLICY "Organization owners can update organization" ON public.organizations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = id AND om.user_id = auth.uid() AND om.organization_role = 'owner' AND om.is_active));
DROP POLICY IF EXISTS "Members can view organization memberships" ON public.organization_members;
CREATE POLICY "Members can view organization memberships" ON public.organization_members FOR SELECT TO authenticated USING (public.organization_member(auth.uid(), organization_id));

CREATE POLICY "School admins manage academic years" ON public.academic_years FOR ALL TO authenticated USING (public.is_school_admin(auth.uid(), school_id)) WITH CHECK (public.is_school_admin(auth.uid(), school_id));
CREATE POLICY "School members view academic years" ON public.academic_years FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id = academic_years.school_id AND sm.user_id = auth.uid() AND sm.is_active));
CREATE POLICY "School admins manage terms" ON public.academic_terms FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.academic_years ay WHERE ay.id = academic_terms.academic_year_id AND public.is_school_admin(auth.uid(), ay.school_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.academic_years ay WHERE ay.id = academic_terms.academic_year_id AND public.is_school_admin(auth.uid(), ay.school_id)));
CREATE POLICY "School admins manage grading scales" ON public.grading_scales FOR ALL TO authenticated USING (public.is_school_admin(auth.uid(), school_id)) WITH CHECK (public.is_school_admin(auth.uid(), school_id));
CREATE POLICY "School members view grading scales" ON public.grading_scales FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id = grading_scales.school_id AND sm.user_id = auth.uid() AND sm.is_active));
CREATE POLICY "School admins manage grading items" ON public.grading_scale_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.grading_scales gs WHERE gs.id = grading_scale_items.grading_scale_id AND public.is_school_admin(auth.uid(), gs.school_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.grading_scales gs WHERE gs.id = grading_scale_items.grading_scale_id AND public.is_school_admin(auth.uid(), gs.school_id)));
CREATE POLICY "School staff manage learner stages" ON public.learner_stages FOR ALL TO authenticated USING (public.is_school_admin(auth.uid(), school_id)) WITH CHECK (public.is_school_admin(auth.uid(), school_id));
CREATE POLICY "School members view learner stages" ON public.learner_stages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id = learner_stages.school_id AND sm.user_id = auth.uid() AND sm.is_active));
CREATE POLICY "School staff manage curricula" ON public.school_curricula FOR ALL TO authenticated USING (public.is_school_staff(auth.uid(), school_id)) WITH CHECK (public.is_school_staff(auth.uid(), school_id));
CREATE POLICY "School admins manage invites" ON public.school_invites FOR ALL TO authenticated USING (public.is_school_admin(auth.uid(), school_id)) WITH CHECK (public.is_school_admin(auth.uid(), school_id));
CREATE POLICY "School admins manage domains" ON public.school_domains FOR ALL TO authenticated USING (public.is_school_admin(auth.uid(), school_id)) WITH CHECK (public.is_school_admin(auth.uid(), school_id));
CREATE POLICY "School admins manage imports" ON public.school_import_jobs FOR ALL TO authenticated USING (public.is_school_admin(auth.uid(), school_id)) WITH CHECK (public.is_school_admin(auth.uid(), school_id));
CREATE POLICY "School admins manage import rows" ON public.school_import_rows FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.school_import_jobs ij WHERE ij.id = school_import_rows.job_id AND public.is_school_admin(auth.uid(), ij.school_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.school_import_jobs ij WHERE ij.id = school_import_rows.job_id AND public.is_school_admin(auth.uid(), ij.school_id)));

-- Atomic initial setup used by the onboarding wizard.
CREATE OR REPLACE FUNCTION public.create_school_onboarding(payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor UUID := auth.uid();
  org_id UUID;
  school_id UUID;
  year_id UUID;
  grading_id UUID;
  item JSONB;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF length(trim(payload->>'organization_name')) < 2 THEN RAISE EXCEPTION 'Organization name is required'; END IF;
  IF length(trim(payload->>'school_name')) < 2 THEN RAISE EXCEPTION 'School name is required'; END IF;
  IF (payload->>'starts_on')::date >= (payload->>'ends_on')::date THEN RAISE EXCEPTION 'Academic year dates are invalid'; END IF;

  INSERT INTO organizations (name, legal_name, country_code, status, created_by)
  VALUES (trim(payload->>'organization_name'), NULLIF(trim(payload->>'legal_name'), ''), COALESCE(NULLIF(payload->>'country_code', ''), 'NG'), 'active', actor)
  RETURNING id INTO org_id;
  INSERT INTO organization_members (organization_id, user_id, organization_role) VALUES (org_id, actor, 'owner');

  INSERT INTO schools (organization_id, name, legal_name, address, city, state, country, country_code, phone, email, website, registration_number, motto, school_type, created_by, timezone, locale, currency_code, regulatory_authority, education_levels, onboarding_status, onboarding_step, activated_at)
  VALUES (org_id, trim(payload->>'school_name'), NULLIF(trim(payload->>'legal_name'), ''), NULLIF(trim(payload->>'address'), ''), NULLIF(trim(payload->>'city'), ''), NULLIF(trim(payload->>'state'), ''), COALESCE(NULLIF(payload->>'country_name', ''), 'Nigeria'), COALESCE(NULLIF(payload->>'country_code', ''), 'NG'), NULLIF(trim(payload->>'phone'), ''), NULLIF(trim(payload->>'email'), ''), NULLIF(trim(payload->>'website'), ''), NULLIF(trim(payload->>'registration_number'), ''), NULLIF(trim(payload->>'motto'), ''), COALESCE(NULLIF(payload->>'school_type', ''), 'combined'), actor, COALESCE(NULLIF(payload->>'timezone', ''), 'Africa/Lagos'), COALESCE(NULLIF(payload->>'locale', ''), 'en-NG'), COALESCE(NULLIF(payload->>'currency_code', ''), 'NGN'), NULLIF(trim(payload->>'regulatory_authority'), ''), COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(payload->'education_levels', '[]'::jsonb))), ARRAY['secondary']), 'academic_structure', 2, now())
  RETURNING id INTO school_id;
  INSERT INTO school_members (school_id, user_id, school_role) VALUES (school_id, actor, 'owner');

  INSERT INTO academic_years (school_id, name, starts_on, ends_on, status, is_current, created_by)
  VALUES (school_id, trim(payload->>'academic_year_name'), (payload->>'starts_on')::date, (payload->>'ends_on')::date, 'active', true, actor)
  RETURNING id INTO year_id;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'terms', '[]'::jsonb)) LOOP
    INSERT INTO academic_terms (academic_year_id, name, sequence_no, starts_on, ends_on, status)
    VALUES (year_id, item->>'name', (item->>'sequence_no')::integer, (item->>'starts_on')::date, (item->>'ends_on')::date, 'planned');
  END LOOP;

  INSERT INTO grading_scales (school_id, name, scale_type, is_default, created_by) VALUES (school_id, COALESCE(NULLIF(payload->>'grading_name', ''), 'Default percentage scale'), 'percentage', true, actor) RETURNING id INTO grading_id;
  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'grading_items', '[]'::jsonb)) LOOP
    INSERT INTO grading_scale_items (grading_scale_id, label, min_value, max_value, grade_point, description, sequence_no)
    VALUES (grading_id, item->>'label', (item->>'min_value')::numeric, (item->>'max_value')::numeric, NULLIF(item->>'grade_point', '')::numeric, item->>'description', (item->>'sequence_no')::integer);
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'learner_stages', '[]'::jsonb)) LOOP
    INSERT INTO learner_stages (school_id, name, code, sequence_no, age_min, age_max)
    VALUES (school_id, item->>'name', item->>'code', (item->>'sequence_no')::integer, NULLIF(item->>'age_min', '')::integer, NULLIF(item->>'age_max', '')::integer);
  END LOOP;

  INSERT INTO school_curricula (school_id, name, framework_code, country_code, version, status, created_by)
  VALUES (school_id, COALESCE(NULLIF(payload->>'curriculum_name', ''), 'School curriculum'), COALESCE(NULLIF(payload->>'framework_code', ''), 'custom'), COALESCE(NULLIF(payload->>'country_code', ''), 'NG'), '1.0', 'draft', actor);

  UPDATE schools SET onboarding_status = 'people', onboarding_step = 4 WHERE id = school_id;
  RETURN jsonb_build_object('organization_id', org_id, 'school_id', school_id, 'academic_year_id', year_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_school_onboarding(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_school_onboarding(JSONB) TO authenticated;

CREATE INDEX IF NOT EXISTS schools_organization_idx ON public.schools(organization_id);
CREATE INDEX IF NOT EXISTS school_members_role_idx ON public.school_members(school_id, school_role) WHERE is_active;
CREATE INDEX IF NOT EXISTS academic_terms_year_idx ON public.academic_terms(academic_year_id, sequence_no);
CREATE INDEX IF NOT EXISTS learner_stages_school_idx ON public.learner_stages(school_id, sequence_no);
