-- International-grade competency assessment model.
-- Progress is evidence-backed and never replaces the source submission or review.

CREATE TABLE IF NOT EXISTS public.track_module_competencies (
  module_id UUID NOT NULL REFERENCES public.learning_track_modules(id) ON DELETE CASCADE,
  competency_id UUID NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  required_level TEXT NOT NULL DEFAULT 'competent'
    CHECK (required_level IN ('introduced', 'practising', 'competent', 'mastered')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (module_id, competency_id)
);

CREATE TABLE IF NOT EXISTS public.project_competencies (
  project_id UUID NOT NULL REFERENCES public.practical_projects(id) ON DELETE CASCADE,
  competency_id UUID NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  required_level TEXT NOT NULL DEFAULT 'competent'
    CHECK (required_level IN ('introduced', 'practising', 'competent', 'mastered')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, competency_id)
);

CREATE TABLE IF NOT EXISTS public.assessment_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.practical_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 160),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'retired')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

CREATE TABLE IF NOT EXISTS public.rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id UUID NOT NULL REFERENCES public.assessment_rubrics(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES public.competencies(id) ON DELETE SET NULL,
  criterion TEXT NOT NULL CHECK (char_length(trim(criterion)) BETWEEN 2 AND 240),
  description TEXT,
  max_score INTEGER NOT NULL DEFAULT 4 CHECK (max_score BETWEEN 1 AND 100),
  sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rubric_id, sequence_number)
);

CREATE TABLE IF NOT EXISTS public.learner_competency_progress (
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competency_id UUID NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'introduced'
    CHECK (level IN ('introduced', 'practising', 'competent', 'mastered')),
  evidence_count INTEGER NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  last_assessed_at TIMESTAMPTZ,
  assessed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assessor_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, competency_id)
);

CREATE INDEX IF NOT EXISTS track_module_competencies_competency_idx ON public.track_module_competencies (competency_id);
CREATE INDEX IF NOT EXISTS project_competencies_competency_idx ON public.project_competencies (competency_id);
CREATE INDEX IF NOT EXISTS rubric_criteria_rubric_sequence_idx ON public.rubric_criteria (rubric_id, sequence_number);
CREATE INDEX IF NOT EXISTS competency_progress_school_learner_idx ON public.learner_competency_progress (school_id, learner_id);
CREATE INDEX IF NOT EXISTS competency_progress_competency_level_idx ON public.learner_competency_progress (competency_id, level);

ALTER TABLE public.track_module_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_competency_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members view module competency mappings"
  ON public.track_module_competencies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.learning_track_modules m
    JOIN public.learning_tracks t ON t.id = m.track_id
    JOIN public.school_members sm ON sm.school_id = t.school_id
    WHERE m.id = track_module_competencies.module_id AND sm.user_id = auth.uid() AND sm.is_active = true
  ));
CREATE POLICY "Teachers manage module competency mappings"
  ON public.track_module_competencies FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.learning_track_modules m
    JOIN public.learning_tracks t ON t.id = m.track_id
    WHERE m.id = track_module_competencies.module_id AND (public.is_school_admin(auth.uid(), t.school_id) OR EXISTS (
      SELECT 1 FROM public.school_members sm WHERE sm.school_id = t.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
    ))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.learning_track_modules m
    JOIN public.learning_tracks t ON t.id = m.track_id
    WHERE m.id = track_module_competencies.module_id AND (public.is_school_admin(auth.uid(), t.school_id) OR EXISTS (
      SELECT 1 FROM public.school_members sm WHERE sm.school_id = t.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
    ))
  ));

CREATE POLICY "School members view project competency mappings"
  ON public.project_competencies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practical_projects p JOIN public.school_members sm ON sm.school_id = p.school_id
    WHERE p.id = project_competencies.project_id AND sm.user_id = auth.uid() AND sm.is_active = true
  ));
CREATE POLICY "Teachers manage project competency mappings"
  ON public.project_competencies FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practical_projects p
    WHERE p.id = project_competencies.project_id AND (public.is_school_admin(auth.uid(), p.school_id) OR EXISTS (
      SELECT 1 FROM public.school_members sm WHERE sm.school_id = p.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
    ))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.practical_projects p
    WHERE p.id = project_competencies.project_id AND (public.is_school_admin(auth.uid(), p.school_id) OR EXISTS (
      SELECT 1 FROM public.school_members sm WHERE sm.school_id = p.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
    ))
  ));

CREATE POLICY "School members view published rubrics"
  ON public.assessment_rubrics FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practical_projects p JOIN public.school_members sm ON sm.school_id = p.school_id
    WHERE p.id = assessment_rubrics.project_id AND sm.user_id = auth.uid() AND sm.is_active = true AND (assessment_rubrics.status = 'published' OR public.is_school_admin(auth.uid(), p.school_id) OR sm.school_role IN ('teacher', 'instructor'))
  ));
CREATE POLICY "Teachers manage rubrics"
  ON public.assessment_rubrics FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practical_projects p
    WHERE p.id = assessment_rubrics.project_id AND (public.is_school_admin(auth.uid(), p.school_id) OR EXISTS (
      SELECT 1 FROM public.school_members sm WHERE sm.school_id = p.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
    ))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.practical_projects p
    WHERE p.id = assessment_rubrics.project_id AND (public.is_school_admin(auth.uid(), p.school_id) OR EXISTS (
      SELECT 1 FROM public.school_members sm WHERE sm.school_id = p.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
    ))
  ));

CREATE POLICY "School members view rubric criteria"
  ON public.rubric_criteria FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessment_rubrics r JOIN public.practical_projects p ON p.id = r.project_id JOIN public.school_members sm ON sm.school_id = p.school_id
    WHERE r.id = rubric_criteria.rubric_id AND sm.user_id = auth.uid() AND sm.is_active = true
  ));
CREATE POLICY "Teachers manage rubric criteria"
  ON public.rubric_criteria FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessment_rubrics r JOIN public.practical_projects p ON p.id = r.project_id
    WHERE r.id = rubric_criteria.rubric_id AND (public.is_school_admin(auth.uid(), p.school_id) OR EXISTS (
      SELECT 1 FROM public.school_members sm WHERE sm.school_id = p.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
    ))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assessment_rubrics r JOIN public.practical_projects p ON p.id = r.project_id
    WHERE r.id = rubric_criteria.rubric_id AND (public.is_school_admin(auth.uid(), p.school_id) OR EXISTS (
      SELECT 1 FROM public.school_members sm WHERE sm.school_id = p.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
    ))
  ));

CREATE POLICY "Learners view their competency progress"
  ON public.learner_competency_progress FOR SELECT TO authenticated
  USING (learner_id = auth.uid() OR public.is_school_admin(auth.uid(), school_id) OR EXISTS (
    SELECT 1 FROM public.school_members sm WHERE sm.school_id = learner_competency_progress.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
  ));
CREATE POLICY "Teachers assess learner competency progress"
  ON public.learner_competency_progress FOR INSERT TO authenticated
  WITH CHECK (assessed_by = auth.uid() AND (public.is_school_admin(auth.uid(), school_id) OR EXISTS (
    SELECT 1 FROM public.school_members sm WHERE sm.school_id = learner_competency_progress.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
  )));
CREATE POLICY "Teachers update learner competency progress"
  ON public.learner_competency_progress FOR UPDATE TO authenticated
  USING (public.is_school_admin(auth.uid(), school_id) OR EXISTS (
    SELECT 1 FROM public.school_members sm WHERE sm.school_id = learner_competency_progress.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
  ))
  WITH CHECK (public.is_school_admin(auth.uid(), school_id) OR EXISTS (
    SELECT 1 FROM public.school_members sm WHERE sm.school_id = learner_competency_progress.school_id AND sm.user_id = auth.uid() AND sm.school_role IN ('teacher', 'instructor') AND sm.is_active = true
  ));

CREATE TRIGGER learner_competency_progress_updated_at BEFORE UPDATE ON public.learner_competency_progress FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.learner_competency_progress IS 'Current evidence-backed proficiency per learner and competency; source reviews remain immutable records.';
COMMENT ON TABLE public.assessment_rubrics IS 'Versioned project assessment instruments that can be published without mutating historical reviews.';
