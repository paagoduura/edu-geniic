
-- Create teacher_classes table
CREATE TABLE public.teacher_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  class_level public.class_level NOT NULL,
  section text,
  subject public.subject_type,
  academic_year text NOT NULL DEFAULT '2025/2026',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create teacher_class_students table
CREATE TABLE public.teacher_class_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.teacher_classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(class_id, student_id)
);

-- Indexes
CREATE INDEX idx_teacher_classes_teacher_id ON public.teacher_classes(teacher_id);
CREATE INDEX idx_teacher_classes_active ON public.teacher_classes(is_active);
CREATE INDEX idx_class_students_class_id ON public.teacher_class_students(class_id);
CREATE INDEX idx_class_students_student_id ON public.teacher_class_students(student_id);

-- Updated_at trigger
CREATE TRIGGER update_teacher_classes_updated_at
BEFORE UPDATE ON public.teacher_classes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Security definer function: check if teacher owns a class
CREATE OR REPLACE FUNCTION public.owns_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_classes
    WHERE id = _class_id AND teacher_id = _user_id
  )
$$;

-- Enable RLS
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_class_students ENABLE ROW LEVEL SECURITY;

-- RLS: teacher_classes
CREATE POLICY "Teachers can manage their own classes"
ON public.teacher_classes FOR ALL
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students can view classes they belong to"
ON public.teacher_classes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_class_students
    WHERE class_id = teacher_classes.id
      AND student_id = auth.uid()
      AND is_active = true
  )
);

CREATE POLICY "Parents can view children's classes"
ON public.teacher_classes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_child_links pcl
    JOIN public.teacher_class_students tcs ON tcs.student_id = pcl.child_id
    WHERE tcs.class_id = teacher_classes.id
      AND pcl.parent_id = auth.uid()
      AND tcs.is_active = true
  )
);

-- RLS: teacher_class_students
CREATE POLICY "Teachers can manage students in their classes"
ON public.teacher_class_students FOR ALL
USING (public.owns_class(auth.uid(), class_id))
WITH CHECK (public.owns_class(auth.uid(), class_id));

CREATE POLICY "Students can view their own memberships"
ON public.teacher_class_students FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Parents can view children's memberships"
ON public.teacher_class_students FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_child_links
    WHERE parent_id = auth.uid() AND child_id = teacher_class_students.student_id
  )
);
