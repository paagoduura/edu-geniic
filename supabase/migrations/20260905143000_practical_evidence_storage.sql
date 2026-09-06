-- Private evidence storage for practical projects.
-- Object path convention: {school_id}/{learner_id}/{submission_id}/{filename}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'practical-evidence',
  'practical-evidence',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav', 'video/mp4', 'application/pdf', 'text/plain', 'application/zip']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Learners upload evidence to their school folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'practical-evidence'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.school_members sm
      WHERE sm.school_id::text = (storage.foldername(name))[1]
        AND sm.user_id = auth.uid()
        AND sm.is_active = true
    )
  );

CREATE POLICY "Learners and instructors view practical evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'practical-evidence'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.school_members sm
        WHERE sm.school_id::text = (storage.foldername(name))[1]
          AND sm.user_id = auth.uid()
          AND sm.school_role IN ('admin', 'vice_admin', 'teacher', 'instructor')
          AND sm.is_active = true
      )
    )
  );

CREATE POLICY "Learners delete their own evidence"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'practical-evidence'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
