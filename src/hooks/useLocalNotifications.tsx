import { useState, useEffect, useCallback } from 'react';
import { LocalNotifications, ScheduleOptions, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { useToast } from './use-toast';

export interface StudyReminder {
  id: number;
  title: string;
  body: string;
  hour: number;
  minute: number;
  weekdays?: number[]; // 1 = Sunday, 7 = Saturday
}

export const useLocalNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [scheduledReminders, setScheduledReminders] = useState<LocalNotificationSchema[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    setIsSupported(platform === 'ios' || platform === 'android');
  }, []);

  useEffect(() => {
    if (isSupported) {
      checkPermission();
      loadScheduledNotifications();
    }
  }, [isSupported]);

  const checkPermission = async () => {
    try {
      const result = await LocalNotifications.checkPermissions();
      setHasPermission(result.display === 'granted');
    } catch (error) {
      console.error('Error checking notification permission:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Local notifications are only available on mobile devices.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';
      setHasPermission(granted);

      if (granted) {
        toast({
          title: 'Notifications Enabled',
          description: 'You will receive study reminders at your scheduled times.',
        });
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your device settings.',
          variant: 'destructive',
        });
      }

      return granted;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  };

  const loadScheduledNotifications = async () => {
    try {
      const pending = await LocalNotifications.getPending();
      setScheduledReminders(pending.notifications);
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
    }
  };

  const scheduleStudyReminder = useCallback(async (reminder: StudyReminder): Promise<boolean> => {
    if (!isSupported) {
      console.log('Local notifications not supported on web');
      return false;
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      // Create schedule for the reminder
      const now = new Date();
      const scheduleDate = new Date();
      scheduleDate.setHours(reminder.hour, reminder.minute, 0, 0);

      // If the time has passed today, schedule for tomorrow
      if (scheduleDate <= now) {
        scheduleDate.setDate(scheduleDate.getDate() + 1);
      }

      const options: ScheduleOptions = {
        notifications: [
          {
            id: reminder.id,
            title: reminder.title,
            body: reminder.body,
            schedule: {
              at: scheduleDate,
              repeats: true,
              every: 'day',
              allowWhileIdle: true,
            },
            sound: 'default',
            smallIcon: 'ic_stat_icon_config_sample',
            largeIcon: 'ic_launcher',
            actionTypeId: 'STUDY_REMINDER',
            extra: {
              type: 'study_reminder',
            },
          },
        ],
      };

      await LocalNotifications.schedule(options);
      await loadScheduledNotifications();

      toast({
        title: 'Reminder Scheduled',
        description: `Study reminder set for ${formatTime(reminder.hour, reminder.minute)} daily.`,
      });

      return true;
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule reminder. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [isSupported, hasPermission, toast]);

  const scheduleOneTimeReminder = useCallback(async (
    id: number,
    title: string,
    body: string,
    scheduledTime: Date
  ): Promise<boolean> => {
    if (!isSupported) return false;

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            schedule: {
              at: scheduledTime,
              allowWhileIdle: true,
            },
            sound: 'default',
            extra: {
              type: 'one_time_reminder',
            },
          },
        ],
      });

      await loadScheduledNotifications();
      return true;
    } catch (error) {
      console.error('Error scheduling one-time reminder:', error);
      return false;
    }
  }, [isSupported, hasPermission]);

  const cancelReminder = useCallback(async (id: number): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
      await loadScheduledNotifications();

      toast({
        title: 'Reminder Cancelled',
        description: 'The study reminder has been removed.',
      });

      return true;
    } catch (error) {
      console.error('Error cancelling reminder:', error);
      return false;
    }
  }, [isSupported, toast]);

  const cancelAllReminders = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
      setScheduledReminders([]);

      toast({
        title: 'All Reminders Cancelled',
        description: 'All scheduled study reminders have been removed.',
      });

      return true;
    } catch (error) {
      console.error('Error cancelling all reminders:', error);
      return false;
    }
  }, [isSupported, toast]);

  // Set up notification action listeners
  useEffect(() => {
    if (!isSupported) return;

    const setupListeners = async () => {
      await LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('Local notification received:', notification);
      });

      await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        console.log('Local notification action:', action);
        
        const data = action.notification.extra;
        if (data?.type === 'study_reminder') {
          window.location.href = '/dashboard';
        }
      });
    };

    setupListeners();

    return () => {
      LocalNotifications.removeAllListeners();
    };
  }, [isSupported]);

  return {
    isSupported,
    hasPermission,
    scheduledReminders,
    requestPermission,
    scheduleStudyReminder,
    scheduleOneTimeReminder,
    cancelReminder,
    cancelAllReminders,
    refreshReminders: loadScheduledNotifications,
  };
};

// Helper function to format time
const formatTime = (hour: number, minute: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
};
