-- Fix function search path for update_challenge_progress
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

-- Fix function search path for calculate_session_duration
CREATE OR REPLACE FUNCTION public.calculate_session_duration()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.session_end IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start)) / 60;
  END IF;
  RETURN NEW;
END;
$$;