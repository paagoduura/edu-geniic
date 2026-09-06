-- Drop the old restrictive insert policy
DROP POLICY IF EXISTS "Teachers and admins can create competitions" ON public.competitions;

-- Allow any authenticated user to create competitions
CREATE POLICY "Authenticated users can create competitions"
ON public.competitions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Enable realtime for competition_participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_participants;
