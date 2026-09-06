-- Update handle_new_user to read role from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  
  -- Assign the role from metadata (student or parent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;