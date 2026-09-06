-- Forward-only reconciliation for the bounded Supabase SQL-editor rollout.
-- This migration makes the live additive tables compatible with the canonical
-- global readiness migration before the remaining migrations are applied.

ALTER TABLE public.platform_curriculum_versions
  ADD COLUMN IF NOT EXISTS effective_from DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE,
  ADD COLUMN IF NOT EXISTS framework_code TEXT NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE public.platform_curriculum_standards
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.platform_evidence_security_events
  ADD COLUMN IF NOT EXISTS ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS user_agent_hash TEXT;

ALTER TABLE public.platform_evidence_controls
  ADD COLUMN IF NOT EXISTS guardian_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.platform_safeguarding_cases
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

ALTER TABLE public.platform_notification_deliveries
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

ALTER TABLE public.platform_payment_transactions
  ADD COLUMN IF NOT EXISTS provider_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS platform_curriculum_versions_school_idx
  ON public.platform_curriculum_versions(school_id, status);
CREATE INDEX IF NOT EXISTS platform_evidence_security_events_evidence_idx
  ON public.platform_evidence_security_events(evidence_id, created_at DESC);
CREATE INDEX IF NOT EXISTS platform_notification_deliveries_queue_idx
  ON public.platform_notification_deliveries(status, scheduled_at);
