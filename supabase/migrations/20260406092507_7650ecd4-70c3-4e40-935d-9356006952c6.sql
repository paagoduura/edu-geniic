
-- Add school_name to profiles
ALTER TABLE public.profiles ADD COLUMN school_name text;

-- Create competitions table
CREATE TABLE public.competitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  competition_type text NOT NULL DEFAULT 'school', -- 'school', 'individual', 'group'
  subject text NOT NULL,
  class_level text,
  difficulty text NOT NULL DEFAULT 'medium',
  questions jsonb,
  time_limit_minutes integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed'
  created_by uuid NOT NULL,
  winning_school text,
  winning_participant_id uuid,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view competitions"
  ON public.competitions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers and admins can create competitions"
  ON public.competitions FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators can update their competitions"
  ON public.competitions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete competitions"
  ON public.competitions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create competition participants table
CREATE TABLE public.competition_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  school_name text,
  answers jsonb,
  score integer,
  time_spent integer, -- seconds
  completed_at timestamp with time zone,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(competition_id, user_id)
);

ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view participants"
  ON public.competition_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students can join competitions"
  ON public.competition_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own entries"
  ON public.competition_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update handle_new_user to include school_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  user_class_level class_level;
  class_level_text text;
  user_school_name text;
BEGIN
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role, 
    'student'::app_role
  );
  
  class_level_text := NULLIF(TRIM(NEW.raw_user_meta_data->>'class_level'), '');
  
  IF class_level_text IS NOT NULL THEN
    user_class_level := class_level_text::class_level;
  ELSE
    user_class_level := NULL;
  END IF;

  user_school_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'school_name'), '');
  
  INSERT INTO public.profiles (user_id, full_name, class_level, student_id, school_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    user_class_level,
    public.generate_student_id(),
    user_school_name
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;
