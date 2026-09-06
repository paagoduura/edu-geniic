-- EduGenie global production-readiness foundations.
-- Additive migration: introduces tenant-scoped contracts for curriculum,
-- evidence security, formal assessment, safeguarding, notifications, billing,
-- privacy requests, and practical-programme catalogues.

CREATE TABLE IF NOT EXISTS public.platform_curriculum_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  curriculum_id UUID REFERENCES public.school_curricula(id) ON DELETE SET NULL,
  programme_code TEXT NOT NULL CHECK (programme_code ~ '^[a-z0-9_\-]+$'),
  version_label TEXT NOT NULL CHECK (char_length(version_label) BETWEEN 1 AND 40),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
  effective_from DATE,
  effective_to DATE,
  framework_code TEXT NOT NULL DEFAULT 'custom',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  approved_by UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
  UNIQUE (school_id, programme_code, version_label)
);

CREATE TABLE IF NOT EXISTS public.platform_competency_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  curriculum_version_id UUID NOT NULL REFERENCES public.platform_curriculum_versions(id) ON DELETE CASCADE,
  competency_id UUID NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  prerequisite_competency_id UUID NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  minimum_level NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (minimum_level BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (curriculum_version_id, competency_id, prerequisite_competency_id),
  CHECK (competency_id <> prerequisite_competency_id)
);

CREATE TABLE IF NOT EXISTS public.platform_curriculum_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  curriculum_version_id UUID NOT NULL REFERENCES public.platform_curriculum_versions(id) ON DELETE CASCADE,
  authority TEXT NOT NULL CHECK (char_length(authority) BETWEEN 2 AND 160),
  standard_code TEXT NOT NULL CHECK (char_length(standard_code) BETWEEN 1 AND 80),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 240),
  url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (curriculum_version_id, authority, standard_code)
);

CREATE TABLE IF NOT EXISTS public.platform_curriculum_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  curriculum_version_id UUID NOT NULL REFERENCES public.platform_curriculum_versions(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'submitted', 'approved', 'published', 'archived', 'reverted')),
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_curriculum_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  curriculum_version_id UUID NOT NULL REFERENCES public.platform_curriculum_versions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'changes_requested')),
  comments TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_curriculum_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  curriculum_version_id UUID NOT NULL REFERENCES public.platform_curriculum_versions(id) ON DELETE CASCADE,
  published_by UUID NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded_at TIMESTAMPTZ,
  UNIQUE (school_id, curriculum_version_id)
);

CREATE TABLE IF NOT EXISTS public.platform_practical_programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9_\-]+$'),
  name TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 2 AND 160),
  description TEXT NOT NULL,
  safety_level TEXT NOT NULL DEFAULT 'standard' CHECK (safety_level IN ('standard', 'elevated', 'high')), 
  age_min INTEGER CHECK (age_min IS NULL OR age_min >= 2),
  age_max INTEGER CHECK (age_max IS NULL OR age_max >= age_min),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_practical_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES public.platform_practical_programmes(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  sequence_no INTEGER NOT NULL CHECK (sequence_no > 0),
  learning_outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  safety_controls JSONB NOT NULL DEFAULT '[]'::jsonb,
  assessment_rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (programme_id, code),
  UNIQUE (programme_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS public.platform_evidence_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  evidence_id UUID NOT NULL,
  actor_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('uploaded', 'scanned', 'transcoded', 'viewed', 'downloaded', 'shared', 'reported', 'deleted', 'retained', 'quarantined')),
  ip_hash TEXT,
  user_agent_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_evidence_controls (
  evidence_id UUID PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'infected', 'failed', 'quarantined')),
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'reported')),
  copyright_declaration TEXT NOT NULL DEFAULT 'owner' CHECK (copyright_declaration IN ('owner', 'licensed', 'permission_granted', 'unknown')),
  guardian_consent_required BOOLEAN NOT NULL DEFAULT false,
  guardian_consent_at TIMESTAMPTZ,
  retention_until TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 60 AND 86400),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'open', 'closed', 'marked', 'published', 'archived')),
  randomize_questions BOOLEAN NOT NULL DEFAULT true,
  randomize_options BOOLEAN NOT NULL DEFAULT true,
  attempts_allowed INTEGER NOT NULL DEFAULT 1 CHECK (attempts_allowed BETWEEN 1 AND 10),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.platform_exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.platform_exam_sessions(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'true_false', 'short_answer', 'essay', 'practical')), 
  prompt TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  answer_key JSONB,
  points NUMERIC(8,2) NOT NULL CHECK (points > 0),
  competency_id UUID REFERENCES public.competencies(id) ON DELETE SET NULL,
  sequence_no INTEGER NOT NULL CHECK (sequence_no > 0),
  UNIQUE (exam_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS public.platform_exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.platform_exam_sessions(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL,
  attempt_no INTEGER NOT NULL CHECK (attempt_no > 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'under_review', 'marked', 'voided')),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  integrity_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (exam_id, learner_id, attempt_no)
);

CREATE TABLE IF NOT EXISTS public.platform_exam_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.platform_exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.platform_exam_questions(id) ON DELETE CASCADE,
  marker_id UUID NOT NULL,
  mark NUMERIC(8,2) NOT NULL CHECK (mark >= 0),
  feedback TEXT,
  marker_stage INTEGER NOT NULL DEFAULT 1 CHECK (marker_stage IN (1, 2)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id, marker_stage)
);

CREATE TABLE IF NOT EXISTS public.platform_exam_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.platform_exam_attempts(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) >= 10),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'upheld', 'rejected', 'withdrawn')),
  resolution TEXT,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.platform_guardian_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID NOT NULL,
  guardian_id UUID NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('account', 'evidence', 'communications', 'data_processing', 'international_transfer')), 
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'revoked', 'expired')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  UNIQUE (learner_id, guardian_id, consent_type)
);

CREATE TABLE IF NOT EXISTS public.platform_safeguarding_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  learner_id UUID NOT NULL,
  reported_by UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('welfare', 'abuse', 'bullying', 'self_harm', 'online_safety', 'other')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'actioned', 'closed')),
  summary TEXT NOT NULL,
  restricted_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.platform_notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'whatsapp', 'push')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'cancelled')),
  provider_message_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  payer_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'interswitch',
  provider_reference TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency_code CHAR(3) NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded')), 
  provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.platform_payment_transactions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS public.platform_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  outcome TEXT NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'denied', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'rectification', 'deletion', 'portability', 'restriction', 'objection')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'in_progress', 'completed', 'rejected')),
  verification JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  due_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_curriculum_versions_school_idx ON public.platform_curriculum_versions(school_id, status);
CREATE INDEX IF NOT EXISTS platform_evidence_security_events_evidence_idx ON public.platform_evidence_security_events(evidence_id, created_at DESC);
CREATE INDEX IF NOT EXISTS platform_exam_attempts_learner_idx ON public.platform_exam_attempts(learner_id, started_at DESC);
CREATE INDEX IF NOT EXISTS platform_notification_deliveries_queue_idx ON public.platform_notification_deliveries(status, scheduled_at);
CREATE INDEX IF NOT EXISTS platform_audit_events_school_idx ON public.platform_audit_events(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS platform_data_subject_requests_due_idx ON public.platform_data_subject_requests(status, due_at);

-- Seed the global catalogue once. School-specific delivery content remains tenant-owned.
INSERT INTO public.platform_practical_programmes (code, name, description, safety_level, age_min, age_max)
VALUES
  ('catering_hospitality', 'Catering and Hospitality', 'Food preparation, nutrition, service, hygiene, and hospitality operations.', 'elevated', 10, 21),
  ('music_performance', 'Music and Performance', 'Performance, composition, ensemble practice, stagecraft, and production.', 'standard', 8, 21),
  ('agriculture', 'Agriculture', 'Crop production, soil health, animal care, agribusiness, and sustainability.', 'elevated', 8, 21),
  ('fashion_textiles', 'Fashion and Textiles', 'Design, textile science, garment construction, and ethical production.', 'standard', 8, 21),
  ('woodwork', 'Woodwork', 'Design, measurement, hand tools, joinery, finishing, and workshop safety.', 'high', 10, 21),
  ('electrical_installation', 'Electrical Installation', 'Electrical principles, safe installation, testing, and maintenance.', 'high', 14, 21),
  ('plumbing', 'Plumbing', 'Water systems, pipework, maintenance, conservation, and safe practice.', 'high', 12, 21),
  ('automotive_basics', 'Automotive Basics', 'Vehicle systems, diagnostics, maintenance, and workshop safety.', 'high', 12, 21),
  ('entrepreneurship', 'Entrepreneurship', 'Ideation, customer discovery, finance, marketing, and responsible enterprise.', 'standard', 10, 21),
  ('digital_fabrication', 'Digital Fabrication', 'CAD, 3D printing, laser cutting, prototyping, and maker safety.', 'elevated', 10, 21),
  ('photography', 'Photography', 'Composition, lighting, storytelling, editing, and ethical image use.', 'standard', 8, 21),
  ('film_media', 'Film and Media', 'Storyboarding, filming, editing, sound, publishing, and media literacy.', 'standard', 10, 21),
  ('health_first_aid', 'Health and First Aid', 'Personal health, emergency response, first aid, and prevention.', 'elevated', 10, 21),
  ('construction', 'Construction', 'Built environment, materials, measurement, site practice, and safety.', 'high', 14, 21),
  ('beauty_personal_care', 'Beauty and Personal Care', 'Personal care, hygiene, client service, and ethical practice.', 'elevated', 12, 21),
  ('financial_literacy', 'Financial Literacy', 'Money management, saving, credit, risk, taxes, and consumer rights.', 'standard', 8, 21),
  ('environmental_sustainability', 'Environmental Sustainability', 'Climate literacy, circular systems, conservation, and community action.', 'standard', 8, 21)
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, safety_level = EXCLUDED.safety_level, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max;

-- Tenant isolation and least-privilege policies.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'platform_curriculum_versions', 'platform_competency_prerequisites', 'platform_curriculum_standards',
    'platform_curriculum_change_log', 'platform_curriculum_approvals', 'platform_curriculum_publications',
    'platform_evidence_security_events', 'platform_evidence_controls', 'platform_exam_sessions',
    'platform_exam_questions', 'platform_exam_attempts', 'platform_exam_marks', 'platform_exam_appeals',
    'platform_guardian_consents', 'platform_safeguarding_cases', 'platform_notification_deliveries',
    'platform_payment_transactions', 'platform_payment_events', 'platform_audit_events', 'platform_data_subject_requests'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "school members view curriculum versions" ON public.platform_curriculum_versions;
CREATE POLICY "school members view curriculum versions" ON public.platform_curriculum_versions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id = platform_curriculum_versions.school_id AND sm.user_id = auth.uid() AND sm.is_active));
DROP POLICY IF EXISTS "school staff manage curriculum versions" ON public.platform_curriculum_versions;
CREATE POLICY "school staff manage curriculum versions" ON public.platform_curriculum_versions FOR ALL TO authenticated USING (public.is_school_staff(auth.uid(), school_id)) WITH CHECK (public.is_school_staff(auth.uid(), school_id));

DROP POLICY IF EXISTS "school members view curriculum metadata" ON public.platform_curriculum_standards;
CREATE POLICY "school members view curriculum metadata" ON public.platform_curriculum_standards FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id = platform_curriculum_standards.school_id AND sm.user_id = auth.uid() AND sm.is_active));
DROP POLICY IF EXISTS "school staff manage curriculum metadata" ON public.platform_curriculum_standards;
CREATE POLICY "school staff manage curriculum metadata" ON public.platform_curriculum_standards FOR ALL TO authenticated USING (public.is_school_staff(auth.uid(), school_id)) WITH CHECK (public.is_school_staff(auth.uid(), school_id));

DROP POLICY IF EXISTS "school members view practical catalogue" ON public.platform_practical_programmes;
CREATE POLICY "school members view practical catalogue" ON public.platform_practical_programmes FOR SELECT TO authenticated USING (active = true);
DROP POLICY IF EXISTS "school members view practical units" ON public.platform_practical_units;
CREATE POLICY "school members view practical units" ON public.platform_practical_units FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "owners view evidence security events" ON public.platform_evidence_security_events;
CREATE POLICY "owners view evidence security events" ON public.platform_evidence_security_events FOR SELECT TO authenticated USING (actor_id = auth.uid() OR public.is_school_staff(auth.uid(), school_id));
DROP POLICY IF EXISTS "staff manage evidence controls" ON public.platform_evidence_controls;
CREATE POLICY "staff manage evidence controls" ON public.platform_evidence_controls FOR ALL TO authenticated USING (owner_id = auth.uid() OR public.is_school_staff(auth.uid(), school_id)) WITH CHECK (owner_id = auth.uid() OR public.is_school_staff(auth.uid(), school_id));

DROP POLICY IF EXISTS "school members view exams" ON public.platform_exam_sessions;
CREATE POLICY "school members view exams" ON public.platform_exam_sessions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id = platform_exam_sessions.school_id AND sm.user_id = auth.uid() AND sm.is_active));
DROP POLICY IF EXISTS "school staff manage exams" ON public.platform_exam_sessions;
CREATE POLICY "school staff manage exams" ON public.platform_exam_sessions FOR ALL TO authenticated USING (public.is_school_staff(auth.uid(), school_id)) WITH CHECK (public.is_school_staff(auth.uid(), school_id));
DROP POLICY IF EXISTS "learners manage own attempts" ON public.platform_exam_attempts;
CREATE POLICY "learners manage own attempts" ON public.platform_exam_attempts FOR ALL TO authenticated USING (learner_id = auth.uid()) WITH CHECK (learner_id = auth.uid());
DROP POLICY IF EXISTS "staff view exam attempts" ON public.platform_exam_attempts;
CREATE POLICY "staff view exam attempts" ON public.platform_exam_attempts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.platform_exam_sessions es WHERE es.id = exam_id AND public.is_school_staff(auth.uid(), es.school_id)));

DROP POLICY IF EXISTS "guardians manage own consents" ON public.platform_guardian_consents;
CREATE POLICY "guardians manage own consents" ON public.platform_guardian_consents FOR ALL TO authenticated USING (guardian_id = auth.uid() OR learner_id = auth.uid()) WITH CHECK (guardian_id = auth.uid() OR learner_id = auth.uid());
DROP POLICY IF EXISTS "safeguarding staff only" ON public.platform_safeguarding_cases;
CREATE POLICY "safeguarding staff only" ON public.platform_safeguarding_cases FOR ALL TO authenticated USING (reported_by = auth.uid() OR public.is_school_staff(auth.uid(), school_id)) WITH CHECK (reported_by = auth.uid() OR public.is_school_staff(auth.uid(), school_id));

DROP POLICY IF EXISTS "recipients view notifications" ON public.platform_notification_deliveries;
CREATE POLICY "recipients view notifications" ON public.platform_notification_deliveries FOR SELECT TO authenticated USING (recipient_id = auth.uid());
DROP POLICY IF EXISTS "recipients view own payments" ON public.platform_payment_transactions;
CREATE POLICY "recipients view own payments" ON public.platform_payment_transactions FOR SELECT TO authenticated USING (payer_id = auth.uid() OR public.is_school_admin(auth.uid(), school_id));
DROP POLICY IF EXISTS "users manage own data requests" ON public.platform_data_subject_requests;
CREATE POLICY "users manage own data requests" ON public.platform_data_subject_requests FOR ALL TO authenticated USING (requester_id = auth.uid()) WITH CHECK (requester_id = auth.uid());

-- The catalogue is read-only to clients; administrative writes happen via trusted tooling.
REVOKE INSERT, UPDATE, DELETE ON public.platform_practical_programmes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.platform_practical_units FROM authenticated;
