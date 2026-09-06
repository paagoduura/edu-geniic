-- Drop and recreate the handle_new_user function with SECURITY DEFINER
-- This allows the trigger to bypass RLS when inserting into profiles and user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Get the role from metadata, default to 'student' if not provided
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role, 
    'student'::app_role
  );
  
  -- Insert profile with auto-generated student_id
  INSERT INTO public.profiles (user_id, full_name, class_level, student_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE((NEW.raw_user_meta_data->>'class_level')::class_level, NULL),
    public.generate_student_id()
  );
  
  -- Assign the role from metadata (student, parent, or teacher)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;

-- Ensure the generate_student_id function has proper search_path
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  counter INTEGER := 0;
BEGIN
  LOOP
    new_id := 'STU-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    -- Check if this ID already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE student_id = new_id) THEN
      RETURN new_id;
    END IF;
    counter := counter + 1;
    -- Prevent infinite loop
    IF counter > 100 THEN
      new_id := 'STU-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT % 100000)::TEXT;
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$;

-- Fix RLS policies that incorrectly use 'public' role instead of 'authenticated'
-- For learning_streaks
DROP POLICY IF EXISTS "Students can insert their own streaks" ON public.learning_streaks;
DROP POLICY IF EXISTS "Students can update their own streaks" ON public.learning_streaks;
DROP POLICY IF EXISTS "Students can view their own streaks" ON public.learning_streaks;

CREATE POLICY "Students can view their own streaks" ON public.learning_streaks
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR has_role(auth.uid(), 'parent'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Students can insert their own streaks" ON public.learning_streaks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own streaks" ON public.learning_streaks
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id);

-- For parent_child_links
DROP POLICY IF EXISTS "Parents can create links" ON public.parent_child_links;
DROP POLICY IF EXISTS "Parents can delete their links" ON public.parent_child_links;
DROP POLICY IF EXISTS "Parents can view their links" ON public.parent_child_links;

CREATE POLICY "Parents can view their links" ON public.parent_child_links
  FOR SELECT TO authenticated
  USING (auth.uid() = parent_id OR auth.uid() = child_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Parents can create links" ON public.parent_child_links
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = parent_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Parents can delete their links" ON public.parent_child_links
  FOR DELETE TO authenticated
  USING (auth.uid() = parent_id OR has_role(auth.uid(), 'admin'::app_role));

-- For study_time_limits
DROP POLICY IF EXISTS "Parents can manage their children's limits" ON public.study_time_limits;
DROP POLICY IF EXISTS "Students can view their limits" ON public.study_time_limits;

CREATE POLICY "Parents can manage their children's limits" ON public.study_time_limits
  FOR ALL TO authenticated
  USING (auth.uid() = parent_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view their limits" ON public.study_time_limits
  FOR SELECT TO authenticated
  USING (auth.uid() = child_id);