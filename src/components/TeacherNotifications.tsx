import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  subject: string;
  class_level: string;
  created_at: string;
}

export const TeacherNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadPendingLessons();
    subscribeToNewLessons();
  }, []);

  const loadPendingLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, subject, class_level, created_at')
        .eq('is_approved', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error('Error loading pending lessons:', error);
    }
  };

  const subscribeToNewLessons = () => {
    const channel = supabase
      .channel('lesson-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lessons',
          filter: 'is_approved=eq.false'
        },
        (payload) => {
          console.log('New lesson submitted:', payload);
          const newLesson = payload.new as Notification;
          
          setNotifications(prev => [newLesson, ...prev]);
          setUnreadCount(prev => prev + 1);

          toast({
            title: '📚 New Lesson Submitted',
            description: `"${newLesson.title}" is waiting for review`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lessons',
          filter: 'is_approved=eq.true'
        },
        (payload) => {
          console.log('Lesson approved:', payload);
          // Remove approved lesson from notifications
          setNotifications(prev => prev.filter(n => n.id !== payload.new.id));
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'lessons'
        },
        (payload) => {
          console.log('Lesson deleted:', payload);
          // Remove deleted lesson from notifications
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleNotificationClick = () => {
    navigate('/teacher');
    setUnreadCount(0);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-4">
          <h3 className="font-semibold">Pending Lesson Reviews</h3>
          <p className="text-sm text-muted-foreground">
            {unreadCount} lesson{unreadCount !== 1 ? 's' : ''} waiting for approval
          </p>
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No pending lessons</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={handleNotificationClick}
                >
                  <h4 className="font-medium text-sm mb-1">{notification.title}</h4>
                  <p className="text-xs text-muted-foreground mb-1">
                    {notification.subject} • {notification.class_level}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={handleNotificationClick}
            >
              View All in Teacher Dashboard
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
