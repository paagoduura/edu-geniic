import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle } from 'lucide-react';

interface Topic {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  icon: string;
}

interface TopicProgress {
  is_completed: boolean;
  solved_problems: number;
  total_problems: number;
}

interface CodingTopicSelectorProps {
  topics: Topic[];
  isLoading: boolean;
  onSelect: (topic: Topic) => void;
  getTopicProgress?: (topicTitle: string) => TopicProgress | undefined;
}

const difficultyColor = (d: string) => {
  if (d === 'beginner') return 'secondary';
  if (d === 'intermediate') return 'default';
  return 'destructive' as const;
};

const CodingTopicSelector = ({ topics, isLoading, onSelect, getTopicProgress }: CodingTopicSelectorProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading coding topics...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {topics.map((topic) => {
        const prog = getTopicProgress?.(topic.title);
        return (
          <Card
            key={topic.id}
            className={`cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all ${prog?.is_completed ? 'border-green-500/50 bg-green-500/5' : ''}`}
            onClick={() => onSelect(topic)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-2xl">{topic.icon}</span>
                <span className="flex-1">{topic.title}</span>
                {prog?.is_completed && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{topic.description}</p>
              <div className="flex items-center gap-2">
                <Badge variant={difficultyColor(topic.difficulty) as any}>{topic.difficulty}</Badge>
                {prog && !prog.is_completed && prog.solved_problems > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {prog.solved_problems}/{prog.total_problems} solved
                  </Badge>
                )}
                {prog?.is_completed && (
                  <Badge variant="outline" className="text-xs border-green-500/50 text-green-600 dark:text-green-400">
                    Completed ✓
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default CodingTopicSelector;
