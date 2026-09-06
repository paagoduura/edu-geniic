import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useCodingRewards = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const awardTopicCompletion = useCallback(async (language: string, topicTitle: string) => {
    if (!user) return;

    // Award 25 points for completing a topic
    const points = 25;

    try {
      // Update reward points on profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('reward_points')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ reward_points: (profile.reward_points || 0) + points })
          .eq('user_id', user.id);
      }

      // Record points transaction
      await supabase.from('points_transactions').insert({
        student_id: user.id,
        points_amount: points,
        transaction_type: 'coding_topic_completed',
        description: `Completed ${topicTitle} in ${language}`,
      });

      // Award achievement badge
      const badgeName = `${language} - ${topicTitle}`;
      const { data: existing } = await supabase
        .from('achievements')
        .select('id')
        .eq('student_id', user.id)
        .eq('badge_name', badgeName)
        .maybeSingle();

      if (!existing) {
        await supabase.from('achievements').insert({
          student_id: user.id,
          badge_name: badgeName,
          badge_type: 'coding',
          badge_description: `Completed all problems in ${topicTitle} (${language})`,
          icon: '💻',
          color: getLanguageColor(language),
          tier: 'bronze',
        });
      }

      // Check milestone badges
      await checkMilestones(language);

      toast({
        title: '🎉 Topic Completed!',
        description: `+${points} reward points earned!`,
      });
    } catch (err) {
      console.error('Error awarding rewards:', err);
    }
  }, [user, toast]);

  const checkMilestones = useCallback(async (language: string) => {
    if (!user) return;

    const { data: progress } = await supabase
      .from('coding_progress')
      .select('*')
      .eq('student_id', user.id)
      .eq('is_completed', true);

    if (!progress) return;

    const totalCompleted = progress.length;
    const langCompleted = progress.filter(p => p.language === language).length;

    const milestones = [
      { count: 3, langCount: 3, badge: `${language} Explorer`, tier: 'bronze', desc: `Completed 3 ${language} topics`, icon: '🔰' },
      { count: 5, langCount: 5, badge: `${language} Developer`, tier: 'silver', desc: `Completed 5 ${language} topics`, icon: '⭐' },
      { count: 10, langCount: 10, badge: `${language} Master`, tier: 'gold', desc: `Completed 10 ${language} topics`, icon: '👑' },
      { count: 10, langCount: 0, badge: 'Code Enthusiast', tier: 'bronze', desc: 'Completed 10 coding topics total', icon: '🚀', global: true },
      { count: 25, langCount: 0, badge: 'Code Wizard', tier: 'silver', desc: 'Completed 25 coding topics total', icon: '🧙', global: true },
      { count: 50, langCount: 0, badge: 'Code Legend', tier: 'gold', desc: 'Completed 50 coding topics total', icon: '🏆', global: true },
    ];

    for (const m of milestones) {
      const qualifies = m.global ? totalCompleted >= m.count : langCompleted >= m.langCount;
      if (!qualifies) continue;

      const { data: exists } = await supabase
        .from('achievements')
        .select('id')
        .eq('student_id', user.id)
        .eq('badge_name', m.badge)
        .maybeSingle();

      if (!exists) {
        await supabase.from('achievements').insert({
          student_id: user.id,
          badge_name: m.badge,
          badge_type: 'coding_milestone',
          badge_description: m.desc,
          icon: m.icon,
          color: m.tier === 'gold' ? '#FFD700' : m.tier === 'silver' ? '#C0C0C0' : '#CD7F32',
          tier: m.tier,
        });

        const bonusPoints = m.tier === 'gold' ? 100 : m.tier === 'silver' ? 50 : 25;
        await supabase.from('points_transactions').insert({
          student_id: user.id,
          points_amount: bonusPoints,
          transaction_type: 'coding_milestone',
          description: `Earned "${m.badge}" badge`,
        });

        const { data: profile } = await supabase
          .from('profiles')
          .select('reward_points')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ reward_points: (profile.reward_points || 0) + bonusPoints })
            .eq('user_id', user.id);
        }

        toast({
          title: `🏅 Achievement Unlocked!`,
          description: `${m.icon} ${m.badge} (+${bonusPoints} points)`,
        });
      }
    }
  }, [user, toast]);

  return { awardTopicCompletion };
};

function getLanguageColor(lang: string): string {
  const colors: Record<string, string> = {
    javascript: '#F7DF1E',
    python: '#3776AB',
    html: '#E34F26',
    css: '#1572B6',
    react: '#61DAFB',
    typescript: '#3178C6',
    expo: '#000020',
    'react-native': '#61DAFB',
  };
  return colors[lang] || '#6366F1';
}
