-- Create study groups table
CREATE TABLE IF NOT EXISTS public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subject subject_type NOT NULL,
  class_level class_level NOT NULL,
  created_by UUID NOT NULL,
  max_members INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create study group members table
CREATE TABLE IF NOT EXISTS public.study_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- Create shared notes table
CREATE TABLE IF NOT EXISTS public.shared_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  last_edited_by UUID,
  is_collaborative BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create group quizzes table
CREATE TABLE IF NOT EXISTS public.group_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  created_by UUID NOT NULL,
  due_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create group quiz submissions table
CREATE TABLE IF NOT EXISTS public.group_quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.group_quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  answers JSONB NOT NULL,
  score INTEGER,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- Create AI chat sessions table
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  title TEXT DEFAULT 'New Chat',
  subject subject_type,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create AI chat messages table
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_groups
CREATE POLICY "Users can view groups they are members of"
  ON public.study_groups FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.study_group_members
      WHERE group_id = study_groups.id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Users can create study groups"
  ON public.study_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON public.study_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.study_group_members
      WHERE group_id = study_groups.id 
      AND student_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for study_group_members
CREATE POLICY "Users can view group members"
  ON public.study_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_group_members AS sgm
      WHERE sgm.group_id = study_group_members.group_id 
      AND sgm.student_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can add members"
  ON public.study_group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_group_members
      WHERE group_id = study_group_members.group_id 
      AND student_id = auth.uid() 
      AND role = 'admin'
    ) OR student_id = auth.uid()
  );

CREATE POLICY "Group admins can remove members"
  ON public.study_group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.study_group_members AS sgm
      WHERE sgm.group_id = study_group_members.group_id 
      AND sgm.student_id = auth.uid() 
      AND sgm.role = 'admin'
    ) OR student_id = auth.uid()
  );

-- RLS Policies for shared_notes
CREATE POLICY "Group members can view shared notes"
  ON public.shared_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_group_members
      WHERE group_id = shared_notes.group_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create notes"
  ON public.shared_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_group_members
      WHERE group_id = shared_notes.group_id AND student_id = auth.uid()
    ) AND auth.uid() = created_by
  );

CREATE POLICY "Group members can edit collaborative notes"
  ON public.shared_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.study_group_members
      WHERE group_id = shared_notes.group_id AND student_id = auth.uid()
    ) AND is_collaborative = true
  );

CREATE POLICY "Note creators can delete their notes"
  ON public.shared_notes FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for group_quizzes
CREATE POLICY "Group members can view quizzes"
  ON public.group_quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_group_members
      WHERE group_id = group_quizzes.group_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can create quizzes"
  ON public.group_quizzes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_group_members
      WHERE group_id = group_quizzes.group_id 
      AND student_id = auth.uid() 
      AND role = 'admin'
    ) AND auth.uid() = created_by
  );

-- RLS Policies for group_quiz_submissions
CREATE POLICY "Group members can view submissions"
  ON public.group_quiz_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_quizzes gq
      JOIN public.study_group_members sgm ON gq.group_id = sgm.group_id
      WHERE gq.id = group_quiz_submissions.quiz_id AND sgm.student_id = auth.uid()
    )
  );

CREATE POLICY "Students can submit their own answers"
  ON public.group_quiz_submissions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- RLS Policies for ai_chat_sessions
CREATE POLICY "Users can manage their own chat sessions"
  ON public.ai_chat_sessions FOR ALL
  USING (auth.uid() = student_id);

-- RLS Policies for ai_chat_messages
CREATE POLICY "Users can view messages in their sessions"
  ON public.ai_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      WHERE id = ai_chat_messages.session_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their sessions"
  ON public.ai_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      WHERE id = ai_chat_messages.session_id AND student_id = auth.uid()
    )
  );

-- Enable realtime for collaborative features
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_messages;

-- Create function to automatically add creator as admin when creating a group
CREATE OR REPLACE FUNCTION public.add_group_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.study_group_members (group_id, student_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_created
  AFTER INSERT ON public.study_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.add_group_creator_as_admin();