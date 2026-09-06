-- Audit trail for high-stakes assessment and credential actions.
CREATE TABLE IF NOT EXISTS public.assessment_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('rubric_created', 'rubric_published', 'submission_reviewed', 'competency_awarded', 'competency_revised', 'certificate_issued', 'certificate_revoked')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('rubric', 'submission', 'competency_progress', 'certificate')),
  entity_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessment_audit_school_time_idx ON public.assessment_audit_events (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assessment_audit_entity_idx ON public.assessment_audit_events (entity_type, entity_id, created_at DESC);
ALTER TABLE public.assessment_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School staff can view assessment audit events"
  ON public.assessment_audit_events FOR SELECT TO authenticated
  USING (public.is_school_admin(auth.uid(), school_id) OR EXISTS (
    SELECT 1 FROM public.school_members sm
    WHERE sm.school_id = assessment_audit_events.school_id
      AND sm.user_id = auth.uid()
      AND sm.school_role IN ('teacher', 'instructor')
      AND sm.is_active = true
  ));

CREATE POLICY "School staff can create assessment audit events"
  ON public.assessment_audit_events FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (public.is_school_admin(auth.uid(), school_id) OR EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.school_id = assessment_audit_events.school_id
        AND sm.user_id = auth.uid()
        AND sm.school_role IN ('teacher', 'instructor')
        AND sm.is_active = true
    ))
  );

-- Audit events are append-only: there are deliberately no UPDATE or DELETE policies.
CREATE INDEX IF NOT EXISTS learner_certificates_public_status_idx
  ON public.learner_certificates (status, expires_at)
  WHERE is_public = true;

COMMENT ON TABLE public.assessment_audit_events IS 'Append-only audit trail for high-stakes assessment and certificate actions.';
