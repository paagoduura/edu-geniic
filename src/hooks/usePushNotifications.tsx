import { useState, useEffect, useCallback } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface NotificationSettings {
  studyReminders: boolean;
  achievementAlerts: boolean;
  weeklyDigest: boolean;
  reminderTime: string; // HH:mm format
}

const DEFAULT_SETTINGS: NotificationSettings = {
  studyReminders: true,
  achievementAlerts: true,
  weeklyDigest: true,
  reminderTime: '17:00',
};

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Check if running on native platform
    const platform = Capacitor.getPlatform();
    setIsSupported(platform === 'ios' || platform === 'android');
  }, []);

  useEffect(() => {
    if (isSupported) {
      initializePushNotifications();
    }
  }, [isSupported]);

  useEffect(() => {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const initializePushNotifications = async () => {
    try {
      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      
      if (permResult.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();
        setIsRegistered(true);
      }

      // Add listeners
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        setToken(token.value);
        
        // Save token to database for server-side notifications
        if (user) {
          await saveTokenToDatabase(token.value);
        }
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        toast({
          title: notification.title || 'Notification',
          description: notification.body || '',
        });
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Push notification action:', action);
        // Handle notification tap - navigate to relevant screen
        handleNotificationAction(action);
      });

    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  };

  const saveTokenToDatabase = async (pushToken: string) => {
    try {
      // Store the push token in the profiles table or a separate tokens table
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: pushToken } as any)
        .eq('user_id', user?.id);
      
      if (error) {
        console.error('Error saving push token:', error);
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  const handleNotificationAction = (action: ActionPerformed) => {
    const data = action.notification.data;
    
    if (data?.type === 'achievement') {
      window.location.href = '/profile';
    } else if (data?.type === 'study_reminder') {
      window.location.href = '/dashboard';
    } else if (data?.type === 'quiz') {
      window.location.href = '/quiz-setup';
    }
  };

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('notificationSettings', JSON.stringify(updated));
    
    toast({
      title: 'Settings Updated',
      description: 'Your notification preferences have been saved.',
    });
  }, [settings, toast]);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are only available on mobile devices.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const permResult = await PushNotifications.requestPermissions();
      
      if (permResult.receive === 'granted') {
        await PushNotifications.register();
        setIsRegistered(true);
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive study reminders and achievement alerts.',
        });
        return true;
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your device settings.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  };

  // Schedule a local notification for study reminder
  const scheduleStudyReminder = useCallback(async (title: string, body: string, scheduleAt: Date) => {
    if (!isSupported || !isRegistered) return;

    try {
      // For local notifications, we'll use the LocalNotifications plugin
      // This is a simplified version - full implementation would use @capacitor/local-notifications
      console.log('Scheduling study reminder:', { title, body, scheduleAt });
    } catch (error) {
      console.error('Error scheduling reminder:', error);
    }
  }, [isSupported, isRegistered]);

  // Send immediate notification for achievement
  const sendAchievementNotification = useCallback(async (achievementName: string, description: string) => {
    if (!settings.achievementAlerts) return;

    if (isSupported && isRegistered) {
      // On native, the server would send the push notification
      console.log('Achievement notification:', { achievementName, description });
    } else {
      // Fallback to toast on web
      toast({
        title: `🏆 Achievement Unlocked: ${achievementName}`,
        description,
      });
    }
  }, [isSupported, isRegistered, settings.achievementAlerts, toast]);

  return {
    isSupported,
    isRegistered,
    token,
    settings,
    updateSettings,
    requestPermission,
    scheduleStudyReminder,
    sendAchievementNotification,
  };
};
