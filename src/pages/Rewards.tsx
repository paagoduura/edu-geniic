import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Coins, History, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PointsTransaction {
  id: string;
  points_amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

const rewardItems = [
  {
    id: "extra_time",
    name: "Extra Quiz Time",
    description: "Get 10 extra minutes on your next quiz",
    cost: 50,
    icon: "⏰",
  },
  {
    id: "hint_pack",
    name: "Hint Pack",
    description: "Unlock 3 hints for your next lesson",
    cost: 30,
    icon: "💡",
  },
  {
    id: "skip_question",
    name: "Skip Question",
    description: "Skip one difficult question in a quiz",
    cost: 40,
    icon: "⏭️",
  },
  {
    id: "avatar_frame",
    name: "Golden Avatar Frame",
    description: "Unlock a special golden frame for your avatar",
    cost: 100,
    icon: "🖼️",
  },
  {
    id: "theme",
    name: "Premium Theme",
    description: "Unlock a premium color theme",
    cost: 150,
    icon: "🎨",
  },
  {
    id: "badge",
    name: "Exclusive Badge",
    description: "Show off with an exclusive achievement badge",
    cost: 200,
    icon: "🏆",
  },
];

export default function Rewards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userPoints, setUserPoints] = useState(0);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch user's current points
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("reward_points")
        .eq("user_id", user?.id)
        .single();

      if (profileError) throw profileError;
      setUserPoints(profileData?.reward_points || 0);

      // Fetch transaction history
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("points_transactions")
        .select("*")
        .eq("student_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load rewards data");
    } finally {
      setLoading(false);
    }
  };

  const redeemReward = async (item: typeof rewardItems[0]) => {
    if (userPoints < item.cost) {
      toast.error("Not enough points!");
      return;
    }

    try {
      // Deduct points
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ reward_points: userPoints - item.cost })
        .eq("user_id", user?.id);

      if (updateError) throw updateError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from("points_transactions")
        .insert({
          student_id: user?.id,
          points_amount: -item.cost,
          transaction_type: "reward_redeemed",
          description: item.name,
        });

      if (transactionError) throw transactionError;

      toast.success(`Successfully redeemed ${item.name}!`);
      fetchUserData();
    } catch (error: any) {
      console.error("Error redeeming reward:", error);
      toast.error(error.message || "Failed to redeem reward");
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "challenge_completed":
        return "🎯";
      case "quiz_completed":
        return "📝";
      case "reward_redeemed":
        return "🎁";
      case "achievement_unlocked":
        return "🏆";
      default:
        return "✨";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="h-48 bg-muted rounded"></div>
            <div className="h-48 bg-muted rounded"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
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
          <h1 className="text-4xl font-bold text-foreground">Rewards Store</h1>
          <p className="text-muted-foreground mt-2">
            Redeem your hard-earned points for awesome rewards!
          </p>
        </div>
        <Gift className="h-12 w-12 text-primary" />
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/20 rounded-full">
                <Coins className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Balance</p>
                <p className="text-4xl font-bold text-foreground">{userPoints}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Sparkles className="h-5 w-5 mr-2" />
              Points
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="store" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="store" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rewardItems.map((item) => {
              const canAfford = userPoints >= item.cost;
              return (
                <Card
                  key={item.id}
                  className={`transition-all hover:shadow-lg ${
                    !canAfford ? "opacity-60" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="text-5xl mb-4">{item.icon}</div>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-lg">
                        <Coins className="h-4 w-4 mr-1" />
                        {item.cost} pts
                      </Badge>
                      <Button
                        onClick={() => redeemReward(item)}
                        disabled={!canAfford}
                      >
                        {canAfford ? "Redeem" : "Not Enough Points"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transaction History
              </CardTitle>
              <CardDescription>Your points earning and spending history</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transactions yet
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {getTransactionIcon(transaction.transaction_type)}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">
                            {transaction.description ||
                              transaction.transaction_type.replace(/_/g, " ")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(transaction.created_at), "MMM dd, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={transaction.points_amount > 0 ? "default" : "secondary"}
                        className="text-lg px-3 py-1"
                      >
                        {transaction.points_amount > 0 ? "+" : ""}
                        {transaction.points_amount} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}