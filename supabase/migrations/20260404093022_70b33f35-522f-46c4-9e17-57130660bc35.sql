CREATE TABLE public.coding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  language TEXT NOT NULL,
  topic_title TEXT NOT NULL,
  level TEXT NOT NULL,
  solved_problems INTEGER NOT NULL DEFAULT 0,
  total_problems INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, language, topic_title)
);

ALTER TABLE public.coding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own coding progress"
ON public.coding_progress FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_role(auth.uid(), 'parent'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Students can insert their own coding progress"
ON public.coding_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own coding progress"
ON public.coding_progress FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);