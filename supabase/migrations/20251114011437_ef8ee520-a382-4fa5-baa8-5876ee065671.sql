-- Add reward points to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reward_points integer DEFAULT 0;

-- Create weekly challenges table
CREATE TABLE IF NOT EXISTS public.weekly_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  challenge_type text NOT NULL,
  target_value integer NOT NULL,
  reward_points integer NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Create student challenge progress table
CREATE TABLE IF NOT EXISTS public.student_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  challenge_id uuid REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
  current_progress integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  points_earned integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(student_id, challenge_id)
);

-- Create points transactions table
CREATE TABLE IF NOT EXISTS public.points_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  points_amount integer NOT NULL,
  transaction_type text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create parent-child links table
CREATE TABLE IF NOT EXISTS public.parent_child_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

-- Create study time limits table
CREATE TABLE IF NOT EXISTS public.study_time_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL,
  daily_limit_minutes integer NOT NULL,
  weekly_limit_minutes integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

-- Create study sessions table to track time
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  session_start timestamp with time zone DEFAULT now(),
  session_end timestamp with time zone,
  duration_minutes integer,
  subject text,
  created_at timestamp with time zone DEFAULT now()
);

-- Add tier to achievements
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS tier text DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- Enable RLS on new tables
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_time_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_challenges
CREATE POLICY "Anyone can view active challenges"
  ON public.weekly_challenges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Teachers and admins can manage challenges"
  ON public.weekly_challenges FOR ALL
  USING (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for student_challenge_progress
CREATE POLICY "Students can view their own progress"
  ON public.student_challenge_progress FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own progress"
  ON public.student_challenge_progress FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own progress"
  ON public.student_challenge_progress FOR UPDATE
  USING (auth.uid() = student_id);

-- RLS Policies for points_transactions
CREATE POLICY "Students can view their own transactions"
  ON public.points_transactions FOR SELECT
  USING (auth.uid() = student_id OR has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'parent') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can insert transactions"
  ON public.points_transactions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- RLS Policies for parent_child_links
CREATE POLICY "Parents can view their links"
  ON public.parent_child_links FOR SELECT
  USING (auth.uid() = parent_id OR auth.uid() = child_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Parents can create links"
  ON public.parent_child_links FOR INSERT
  WITH CHECK (auth.uid() = parent_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Parents can delete their links"
  ON public.parent_child_links FOR DELETE
  USING (auth.uid() = parent_id OR has_role(auth.uid(), 'admin'));

-- RLS Policies for study_time_limits
CREATE POLICY "Parents can manage their children's limits"
  ON public.study_time_limits FOR ALL
  USING (auth.uid() = parent_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can view their limits"
  ON public.study_time_limits FOR SELECT
  USING (auth.uid() = child_id);

-- RLS Policies for study_sessions
CREATE POLICY "Students can manage their own sessions"
  ON public.study_sessions FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY "Parents can view children's sessions"
  ON public.study_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_links
      WHERE parent_id = auth.uid() AND child_id = student_id
    ) OR has_role(auth.uid(), 'admin')
  );

-- Create function to update challenge progress
CREATE OR REPLACE FUNCTION public.update_challenge_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Check if challenge is completed
  IF NEW.current_progress >= (SELECT target_value FROM weekly_challenges WHERE id = NEW.challenge_id) AND NOT NEW.is_completed THEN
    NEW.is_completed = true;
    NEW.completed_at = now();
    
    -- Award points
    UPDATE profiles 
    SET reward_points = reward_points + (SELECT reward_points FROM weekly_challenges WHERE id = NEW.challenge_id)
    WHERE user_id = NEW.student_id;
    
    -- Record transaction
    INSERT INTO points_transactions (student_id, points_amount, transaction_type, description)
    VALUES (
      NEW.student_id,
      (SELECT reward_points FROM weekly_challenges WHERE id = NEW.challenge_id),
      'challenge_completed',
      (SELECT title FROM weekly_challenges WHERE id = NEW.challenge_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for challenge progress
DROP TRIGGER IF EXISTS on_challenge_progress_update ON public.student_challenge_progress;
CREATE TRIGGER on_challenge_progress_update
  BEFORE UPDATE ON public.student_challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_challenge_progress();

-- Create function to track study session duration
CREATE OR REPLACE FUNCTION public.calculate_session_duration()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.session_end IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start)) / 60;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for session duration
DROP TRIGGER IF EXISTS on_session_end ON public.study_sessions;
CREATE TRIGGER on_session_end
  BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_session_duration();