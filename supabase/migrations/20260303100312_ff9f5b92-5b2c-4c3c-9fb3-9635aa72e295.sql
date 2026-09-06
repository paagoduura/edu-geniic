
-- Announcements table
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  target_type text NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'class', 'class_level')),
  target_class_id uuid REFERENCES public.teacher_classes(id) ON DELETE SET NULL,
  target_class_level text,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own announcements
CREATE POLICY "Teachers can manage their own announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Students can view announcements targeted to them
CREATE POLICY "Students can view relevant announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (
    target_type = 'all'
    OR (target_type = 'class' AND EXISTS (
      SELECT 1 FROM teacher_class_students
      WHERE teacher_class_students.class_id = announcements.target_class_id
      AND teacher_class_students.student_id = auth.uid()
      AND teacher_class_students.is_active = true
    ))
    OR (target_type = 'class_level' AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.class_level::text = announcements.target_class_level
    ))
  );

-- Parents can view announcements for their children
CREATE POLICY "Parents can view children's announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_links pcl
      JOIN teacher_class_students tcs ON tcs.student_id = pcl.child_id
      WHERE pcl.parent_id = auth.uid()
      AND tcs.class_id = announcements.target_class_id
      AND tcs.is_active = true
    )
  );

-- Direct messages table
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  subject text,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Users can view their own messages (sent or received)
CREATE POLICY "Users can view their messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Recipients can mark messages as read
CREATE POLICY "Recipients can update messages"
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

-- Indexes
CREATE INDEX idx_announcements_teacher ON public.announcements(teacher_id);
CREATE INDEX idx_announcements_target_class ON public.announcements(target_class_id);
CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX idx_direct_messages_recipient ON public.direct_messages(recipient_id);
CREATE INDEX idx_direct_messages_created ON public.direct_messages(created_at DESC);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
