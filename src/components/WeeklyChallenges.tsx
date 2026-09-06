import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Calendar, Award, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  reward_points: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface ChallengeProgress {
  challenge_id: string;
  current_progress: number;
  is_completed: boolean;
  completed_at: string | null;
}

export default function WeeklyChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<Record<string, ChallengeProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChallenges();
    }
  }, [user]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);

      // Fetch active challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from("weekly_challenges")
        .select("*")
        .eq("is_active", true)
        .gte("end_date", new Date().toISOString().split("T")[0])
        .order("created_at", { ascending: false });

      if (challengesError) throw challengesError;

      setChallenges(challengesData || []);

      // Fetch user's progress for these challenges
      if (challengesData && challengesData.length > 0) {
        const { data: progressData, error: progressError } = await supabase
          .from("student_challenge_progress")
          .select("*")
          .eq("student_id", user?.id)
          .in(
            "challenge_id",
            challengesData.map((c) => c.id)
          );

        if (progressError) throw progressError;

        const progressMap: Record<string, ChallengeProgress> = {};
        progressData?.forEach((p) => {
          progressMap[p.challenge_id] = p;
        });
        setProgress(progressMap);
      }
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast.error("Failed to load challenges");
    } finally {
      setLoading(false);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    try {
      const { error } = await supabase.from("student_challenge_progress").insert({
        student_id: user?.id,
        challenge_id: challengeId,
        current_progress: 0,
      });

      if (error) throw error;

      toast.success("Challenge joined successfully!");
      fetchChallenges();
    } catch (error: any) {
      console.error("Error joining challenge:", error);
      toast.error(error.message || "Failed to join challenge");
    }
  };

  const getChallengeProgress = (challenge: Challenge) => {
    const challengeProgress = progress[challenge.id];
    if (!challengeProgress) return 0;
    return Math.min(
      (challengeProgress.current_progress / challenge.target_value) * 100,
      100
    );
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-32 bg-muted rounded"></div>
        <div className="h-32 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold text-foreground">Weekly Challenges</h2>
          <p className="text-muted-foreground">Complete challenges to earn bonus points!</p>
        </div>
      </div>

      {challenges.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              No active challenges at the moment. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {challenges.map((challenge) => {
            const challengeProgress = progress[challenge.id];
            const isJoined = !!challengeProgress;
            const isCompleted = challengeProgress?.is_completed;
            const progressPercent = getChallengeProgress(challenge);
            const daysRemaining = getDaysRemaining(challenge.end_date);

            return (
              <Card
                key={challenge.id}
                className={`transition-all hover:shadow-lg ${
                  isCompleted ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {challenge.title}
                        {isCompleted && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {challenge.description}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      <Award className="h-3 w-3 mr-1" />
                      {challenge.reward_points} pts
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isJoined ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {challengeProgress.current_progress} / {challenge.target_value}
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-3" />
                      </div>
                      {isCompleted && (
                        <Badge variant="default" className="w-full justify-center py-2">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Challenge Completed! 🎉
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={() => joinChallenge(challenge.id)}
                      className="w-full"
                    >
                      Join Challenge
                    </Button>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {daysRemaining > 0
                          ? `${daysRemaining} days remaining`
                          : "Ending today!"}
                      </span>
                    </div>
                    <Badge variant="outline">{challenge.challenge_type}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}