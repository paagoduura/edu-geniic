-- Create function to generate student ID
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 5-digit number
    new_id := 'STU-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    
    -- Check if this ID already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE student_id = new_id) INTO exists_check;
    
    -- Exit loop if unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN new_id;
END;
$$;

-- Update existing profiles to have student IDs if they don't have one
UPDATE public.profiles 
SET student_id = public.generate_student_id()
WHERE student_id IS NULL;

-- Modify the handle_new_user function to auto-generate student_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert profile with auto-generated student_id
  INSERT INTO public.profiles (user_id, full_name, class_level, student_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE((NEW.raw_user_meta_data->>'class_level')::class_level, NULL),
    public.generate_student_id()
  );
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;