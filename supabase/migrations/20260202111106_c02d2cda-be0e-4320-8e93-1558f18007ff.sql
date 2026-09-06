-- Create assignments table for teacher-created assignments
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  subject subject_type NOT NULL,
  class_level class_level NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  max_score INTEGER DEFAULT 100,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  content TEXT,
  file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  score INTEGER,
  feedback TEXT,
  graded_by UUID,
  graded_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded', 'returned')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Assignments policies
CREATE POLICY "Teachers can create assignments"
ON public.assignments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can update their assignments"
ON public.assignments FOR UPDATE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can delete their assignments"
ON public.assignments FOR DELETE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view published assignments"
ON public.assignments FOR SELECT
USING (
  is_published = true 
  OR created_by = auth.uid() 
  OR has_role(auth.uid(), 'teacher') 
  OR has_role(auth.uid(), 'admin')
);

-- Submission policies
CREATE POLICY "Students can submit assignments"
ON public.assignment_submissions FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their pending submissions"
ON public.assignment_submissions FOR UPDATE
USING (
  (auth.uid() = student_id AND status IN ('pending', 'submitted'))
  OR has_role(auth.uid(), 'teacher')
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Students can view their submissions, teachers can view all"
ON public.assignment_submissions FOR SELECT
USING (
  auth.uid() = student_id 
  OR has_role(auth.uid(), 'teacher') 
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM parent_child_links 
    WHERE parent_id = auth.uid() AND child_id = assignment_submissions.student_id
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();