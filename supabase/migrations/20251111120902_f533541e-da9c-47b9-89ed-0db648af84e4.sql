-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  icon TEXT,
  color TEXT
);

-- Create learning goals table
CREATE TABLE IF NOT EXISTS public.learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_title TEXT NOT NULL,
  goal_description TEXT,
  target_date DATE,
  is_completed BOOLEAN DEFAULT false,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create streaks table
CREATE TABLE IF NOT EXISTS public.learning_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id)
);

-- Enable RLS on achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own achievements"
ON public.achievements FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own achievements"
ON public.achievements FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Enable RLS on learning_goals
ALTER TABLE public.learning_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own goals"
ON public.learning_goals FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can create their own goals"
ON public.learning_goals FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own goals"
ON public.learning_goals FOR UPDATE
USING (auth.uid() = student_id);

CREATE POLICY "Students can delete their own goals"
ON public.learning_goals FOR DELETE
USING (auth.uid() = student_id);

-- Enable RLS on learning_streaks
ALTER TABLE public.learning_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own streaks"
ON public.learning_streaks FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own streaks"
ON public.learning_streaks FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own streaks"
ON public.learning_streaks FOR UPDATE
USING (auth.uid() = student_id);

-- Enable realtime for lessons table (for teacher notifications)
ALTER TABLE public.lessons REPLICA IDENTITY FULL;

-- Create function to update streak
CREATE OR REPLACE FUNCTION public.update_learning_streak(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  streak_record RECORD;
  days_since_last INTEGER;
BEGIN
  SELECT * INTO streak_record
  FROM public.learning_streaks
  WHERE student_id = user_id;

  IF streak_record IS NULL THEN
    -- Create new streak record
    INSERT INTO public.learning_streaks (student_id, current_streak, longest_streak, last_activity_date)
    VALUES (user_id, 1, 1, CURRENT_DATE);
  ELSE
    days_since_last := CURRENT_DATE - streak_record.last_activity_date;
    
    IF days_since_last = 0 THEN
      -- Same day, no update needed
      RETURN;
    ELSIF days_since_last = 1 THEN
      -- Consecutive day, increment streak
      UPDATE public.learning_streaks
      SET 
        current_streak = streak_record.current_streak + 1,
        longest_streak = GREATEST(streak_record.longest_streak, streak_record.current_streak + 1),
        last_activity_date = CURRENT_DATE,
        updated_at = now()
      WHERE student_id = user_id;
    ELSE
      -- Streak broken, reset to 1
      UPDATE public.learning_streaks
      SET 
        current_streak = 1,
        last_activity_date = CURRENT_DATE,
        updated_at = now()
      WHERE student_id = user_id;
    END IF;
  END IF;
END;
$$;