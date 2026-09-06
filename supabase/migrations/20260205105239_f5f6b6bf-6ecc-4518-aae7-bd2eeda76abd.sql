-- Fix handle_new_user function to handle empty class_level strings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  user_class_level class_level;
  class_level_text text;
BEGIN
  -- Get the role from metadata, default to 'student' if not provided
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role, 
    'student'::app_role
  );
  
  -- Get class_level text and handle empty strings
  class_level_text := NULLIF(TRIM(NEW.raw_user_meta_data->>'class_level'), '');
  
  -- Only cast to enum if we have a non-empty value
  IF class_level_text IS NOT NULL THEN
    user_class_level := class_level_text::class_level;
  ELSE
    user_class_level := NULL;
  END IF;
  
  -- Insert profile with auto-generated student_id
  INSERT INTO public.profiles (user_id, full_name, class_level, student_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    user_class_level,
    public.generate_student_id()
  );
  
  -- Assign the role from metadata (student, parent, or teacher)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;