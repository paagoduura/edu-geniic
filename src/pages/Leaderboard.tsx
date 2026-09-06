import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, TrendingUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  reward_points: number;
  class_level: string;
  rank: number;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [classLeaderboard, setClassLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchLeaderboards();
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);

      // Fetch global leaderboard
      const { data: globalData, error: globalError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, reward_points, class_level")
        .order("reward_points", { ascending: false })
        .limit(50);

      if (globalError) throw globalError;

      const globalWithRanks = globalData?.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      })) || [];

      setGlobalLeaderboard(globalWithRanks);

      // Fetch class-specific leaderboard if user has class_level
      if (userProfile?.class_level) {
        const { data: classData, error: classError } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, reward_points, class_level")
          .eq("class_level", userProfile.class_level)
          .order("reward_points", { ascending: false })
          .limit(50);

        if (classError) throw classError;

        const classWithRanks = classData?.map((entry, index) => ({
          ...entry,
          rank: index + 1,
        })) || [];

        setClassLeaderboard(classWithRanks);
      }
    } catch (error) {
      console.error("Error fetching leaderboards:", error);
      toast.error("Failed to load leaderboards");
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  const LeaderboardTable = ({ data }: { data: LeaderboardEntry[] }) => (
    <div className="space-y-3">
      {data.map((entry) => {
        const isCurrentUser = entry.user_id === user?.id;
        return (
          <Card
            key={entry.user_id}
            className={`transition-all hover:shadow-md ${
              isCurrentUser ? "border-primary bg-primary/5" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={entry.avatar_url || ""} />
                    <AvatarFallback>
                      {entry.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {entry.full_name}
                      {isCurrentUser && (
                        <Badge variant="secondary" className="ml-2">
                          You
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {entry.class_level?.replace(/_/g, " ").toUpperCase() || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold text-primary">
                    {entry.reward_points}
                  </span>
                  <span className="text-sm text-muted-foreground">pts</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-muted-foreground mt-2">
            Compete with fellow students and climb the ranks!
          </p>
        </div>
        <Trophy className="h-12 w-12 text-primary" />
      </div>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="global">Global Rankings</TabsTrigger>
          <TabsTrigger value="class" disabled={!userProfile?.class_level}>
            My Class
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Global Leaderboard</CardTitle>
              <CardDescription>
                Top students across all classes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {globalLeaderboard.length > 0 ? (
                <LeaderboardTable data={globalLeaderboard} />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No data available yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="class" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Leaderboard</CardTitle>
              <CardDescription>
                Top students in your class:{" "}
                {userProfile?.class_level?.replace(/_/g, " ").toUpperCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {classLeaderboard.length > 0 ? (
                <LeaderboardTable data={classLeaderboard} />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No data available yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}