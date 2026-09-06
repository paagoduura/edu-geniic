-- EduGenie practical learning foundation
-- Supports academic, creative, technical, vocational, and entrepreneurship tracks.

CREATE TABLE IF NOT EXISTS public.learning_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 160),
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description TEXT,
  track_type TEXT NOT NULL DEFAULT 'practical'
    CHECK (track_type IN ('academic', 'creative', 'technical', 'vocational', 'entrepreneurship', 'personal_development')),
  learner_stage TEXT NOT NULL DEFAULT 'secondary'
    CHECK (learner_stage IN ('nursery', 'primary', 'secondary', 'tertiary', 'adult', 'all_ages')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  estimated_hours INTEGER CHECK (estimated_hours IS NULL OR estimated_hours > 0),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, slug)
);

CREATE TABLE IF NOT EXISTS public.learning_track_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.learning_tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 160),
  description TEXT,
  sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
  module_type TEXT NOT NULL DEFAULT 'lesson'
    CHECK (module_type IN ('lesson', 'theory', 'demonstration', 'guided_practice', 'project', 'assessment', 'reflection')),
  safety_required BOOLEAN NOT NULL DEFAULT false,
  estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, sequence_number)
);

CREATE TABLE IF NOT EXISTS public.competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.learning_tracks(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 160),
  description TEXT,
  proficiency_levels JSONB NOT NULL DEFAULT '[{"level":"introduced"},{"level":"practising"},{"level":"competent"},{"level":"mastered"}]'::jsonb,
  evidence_types TEXT[] NOT NULL DEFAULT ARRAY['text', 'image', 'video'],
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, name)
);

CREATE TABLE IF NOT EXISTS public.practical_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.learning_tracks(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.learning_track_modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 200),
  instructions TEXT NOT NULL,
  safety_instructions TEXT,
  rubric JSONB NOT NULL DEFAULT '[]'::jsonb,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.practical_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.practical_projects(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_text TEXT,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted', 'under_review', 'needs_revision', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, learner_id)
);

CREATE TABLE IF NOT EXISTS public.instructor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.practical_submissions(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  rubric_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_score NUMERIC(5,2) CHECK (overall_score IS NULL OR overall_score BETWEEN 0 AND 100),
  feedback TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('needs_revision', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learner_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Learning Portfolio',
  bio TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, learner_id)
);

CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.learner_portfolios(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.practical_submissions(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 200),
  description TEXT,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learner_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.learning_tracks(id) ON DELETE RESTRICT,
  certificate_number TEXT NOT NULL UNIQUE,
  verification_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  recipient_display_name TEXT NOT NULL CHECK (char_length(trim(recipient_display_name)) BETWEEN 2 AND 160),
  credential_title TEXT NOT NULL CHECK (char_length(trim(credential_title)) BETWEEN 2 AND 200),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'revoked', 'expired')),
  is_public BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR expires_at > issued_at)
);

CREATE INDEX IF NOT EXISTS learning_tracks_school_status_idx ON public.learning_tracks (school_id, status);
CREATE INDEX IF NOT EXISTS track_modules_track_sequence_idx ON public.learning_track_modules (track_id, sequence_number);
CREATE INDEX IF NOT EXISTS practical_projects_school_status_idx ON public.practical_projects (school_id, status);
CREATE INDEX IF NOT EXISTS practical_submissions_learner_status_idx ON public.practical_submissions (learner_id, status);
CREATE INDEX IF NOT EXISTS practical_submissions_school_idx ON public.practical_submissions (school_id);
CREATE INDEX IF NOT EXISTS instructor_reviews_submission_idx ON public.instructor_reviews (submission_id);
CREATE INDEX IF NOT EXISTS portfolio_items_portfolio_published_idx ON public.portfolio_items (portfolio_id, published);
CREATE INDEX IF NOT EXISTS certificates_verification_idx ON public.learner_certificates (verification_code) WHERE is_public = true;

ALTER TABLE public.learning_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_track_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practical_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practical_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_certificates ENABLE ROW LEVEL SECURITY;

-- A school member is allowed to read published learning materials for that school.
CREATE POLICY "School members can view published learning tracks"
  ON public.learning_tracks FOR SELECT TO authenticated
  USING (status = 'published' AND EXISTS (
    SELECT 1 FROM public.school_members sm
    WHERE sm.school_id = learning_tracks.school_id AND sm.user_id = auth.uid() AND sm.is_active = true
  ));
CREATE POLICY "School admins and teachers manage learning tracks"
  ON public.learning_tracks FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_id) OR EXISTS (
    SELECT 1 FROM public.school_members sm
    WHERE sm.school_id = learning_tracks.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
  ))
  WITH CHECK (public.is_school_admin(auth.uid(), school_id) OR EXISTS (
    SELECT 1 FROM public.school_members sm
    WHERE sm.school_id = learning_tracks.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
  ));

CREATE POLICY "Members can view track modules"
  ON public.learning_track_modules FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.learning_tracks lt JOIN public.school_members sm ON sm.school_id = lt.school_id
    WHERE lt.id = learning_track_modules.track_id AND sm.user_id = auth.uid() AND sm.is_active = true
      AND (lt.status = 'published' OR public.is_school_admin(auth.uid(), lt.school_id) OR sm.school_role IN ('teacher', 'instructor'))
  ));
CREATE POLICY "Teachers manage track modules"
  ON public.learning_track_modules FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.learning_tracks lt
    WHERE lt.id = learning_track_modules.track_id AND (public.is_school_admin(auth.uid(), lt.school_id) OR EXISTS (
      SELECT 1 FROM public.school_members sm WHERE sm.school_id = lt.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
    ))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.learning_tracks lt
    WHERE lt.id = learning_track_modules.track_id AND (public.is_school_admin(auth.uid(), lt.school_id) OR EXISTS (
      SELECT 1 FROM public.school_members sm WHERE sm.school_id = lt.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
    ))
  ));

CREATE POLICY "School members can view competencies"
  ON public.competencies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.learning_tracks lt JOIN public.school_members sm ON sm.school_id = lt.school_id
    WHERE lt.id = competencies.track_id AND sm.user_id = auth.uid() AND sm.is_active = true
  ));
CREATE POLICY "Teachers manage competencies"
  ON public.competencies FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.learning_tracks lt
    WHERE lt.id = competencies.track_id AND (public.is_school_admin(auth.uid(), lt.school_id) OR EXISTS (
      SELECT 1 FROM public.school_members sm WHERE sm.school_id = lt.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
    ))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.learning_tracks lt
    WHERE lt.id = competencies.track_id AND (public.is_school_admin(auth.uid(), lt.school_id) OR EXISTS (
      SELECT 1 FROM public.school_members sm WHERE sm.school_id = lt.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
    ))
  ));

CREATE POLICY "Members can view published practical projects"
  ON public.practical_projects FOR SELECT TO authenticated
  USING (status = 'published' AND EXISTS (
    SELECT 1 FROM public.school_members sm WHERE sm.school_id = practical_projects.school_id AND sm.user_id = auth.uid() AND sm.is_active = true
  ));
CREATE POLICY "Teachers manage practical projects"
  ON public.practical_projects FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_id) OR EXISTS (
    SELECT 1 FROM public.school_members sm WHERE sm.school_id = practical_projects.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
  ))
  WITH CHECK (public.is_school_admin(auth.uid(), school_id) OR EXISTS (
    SELECT 1 FROM public.school_members sm WHERE sm.school_id = practical_projects.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
  ));

CREATE POLICY "Learners manage their own submissions"
  ON public.practical_submissions FOR ALL TO authenticated
  USING (learner_id = auth.uid() OR public.is_school_admin(auth.uid(), school_id) OR EXISTS (
    SELECT 1 FROM public.school_members sm WHERE sm.school_id = practical_submissions.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
  ))
  WITH CHECK (learner_id = auth.uid() OR public.is_school_admin(auth.uid(), school_id) OR EXISTS (
    SELECT 1 FROM public.school_members sm WHERE sm.school_id = practical_submissions.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
  ));

CREATE POLICY "Learners and teachers view reviews"
  ON public.instructor_reviews FOR SELECT TO authenticated
  USING (instructor_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.practical_submissions ps WHERE ps.id = instructor_reviews.submission_id AND (ps.learner_id = auth.uid() OR public.is_school_admin(auth.uid(), ps.school_id))
  ));
CREATE POLICY "Teachers manage reviews"
  ON public.instructor_reviews FOR INSERT TO authenticated
  WITH CHECK (instructor_id = auth.uid() AND (public.is_school_admin(auth.uid(), school_id) OR EXISTS (
    SELECT 1 FROM public.school_members sm WHERE sm.school_id = instructor_reviews.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
  )));

CREATE POLICY "Learners manage their portfolios"
  ON public.learner_portfolios FOR ALL TO authenticated
  USING (learner_id = auth.uid() OR public.is_school_admin(auth.uid(), school_id))
  WITH CHECK (learner_id = auth.uid() OR public.is_school_admin(auth.uid(), school_id));
CREATE POLICY "Public portfolios expose only published items"
  ON public.portfolio_items FOR SELECT TO anon, authenticated
  USING (published = true AND EXISTS (
    SELECT 1 FROM public.learner_portfolios lp WHERE lp.id = portfolio_items.portfolio_id AND lp.is_public = true
  ));
CREATE POLICY "Portfolio owners manage items"
  ON public.portfolio_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.learner_portfolios lp WHERE lp.id = portfolio_items.portfolio_id AND (lp.learner_id = auth.uid() OR public.is_school_admin(auth.uid(), lp.school_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.learner_portfolios lp WHERE lp.id = portfolio_items.portfolio_id AND (lp.learner_id = auth.uid() OR public.is_school_admin(auth.uid(), lp.school_id))));

CREATE POLICY "Learners and school staff view certificates"
  ON public.learner_certificates FOR SELECT TO authenticated
  USING (learner_id = auth.uid() OR public.is_school_admin(auth.uid(), school_id) OR EXISTS (
    SELECT 1 FROM public.school_members sm WHERE sm.school_id = learner_certificates.school_id AND sm.user_id = auth.uid() AND sm.is_active = true
  ));
CREATE POLICY "Public verification can view issued certificates"
  ON public.learner_certificates FOR SELECT TO anon
  USING (is_public = true AND status = 'issued' AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "School admins issue certificates"
  ON public.learner_certificates FOR INSERT TO authenticated
  WITH CHECK (public.is_school_admin(auth.uid(), school_id));
CREATE POLICY "School admins revoke certificates"
  ON public.learner_certificates FOR UPDATE TO authenticated
  USING (public.is_school_admin(auth.uid(), school_id))
  WITH CHECK (public.is_school_admin(auth.uid(), school_id));

CREATE TRIGGER learning_tracks_updated_at BEFORE UPDATE ON public.learning_tracks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER learning_track_modules_updated_at BEFORE UPDATE ON public.learning_track_modules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER practical_projects_updated_at BEFORE UPDATE ON public.practical_projects FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER practical_submissions_updated_at BEFORE UPDATE ON public.practical_submissions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER learner_portfolios_updated_at BEFORE UPDATE ON public.learner_portfolios FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.learning_tracks IS 'Configurable academic, creative, technical, vocational, and entrepreneurship learning pathways scoped to a school.';
COMMENT ON TABLE public.competencies IS 'Observable skills with structured proficiency levels and evidence requirements.';
COMMENT ON TABLE public.practical_submissions IS 'Learner evidence submitted for practical project assessment.';
COMMENT ON TABLE public.learner_certificates IS 'Verifiable achievement records issued by a school.';
