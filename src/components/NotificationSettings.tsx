import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Clock, Trophy, BookOpen, Calendar, Trash2, Plus } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useLocalNotifications, StudyReminder } from '@/hooks/useLocalNotifications';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

const PRESET_REMINDERS: StudyReminder[] = [
  { id: 1, title: '📚 Morning Study Time', body: 'Start your day with a quick lesson!', hour: 8, minute: 0 },
  { id: 2, title: '📖 Afternoon Review', body: 'Perfect time to review what you learned!', hour: 15, minute: 0 },
  { id: 3, title: '🌙 Evening Practice', body: 'End your day with some practice questions!', hour: 19, minute: 0 },
];

export const NotificationSettings = () => {
  const {
    isSupported: isPushSupported,
    isRegistered,
    settings,
    updateSettings,
    requestPermission: requestPushPermission,
  } = usePushNotifications();

  const {
    isSupported: isLocalSupported,
    hasPermission: hasLocalPermission,
    scheduledReminders,
    requestPermission: requestLocalPermission,
    scheduleStudyReminder,
    cancelReminder,
    cancelAllReminders,
  } = useLocalNotifications();

  const [customTime, setCustomTime] = useState('17:00');
  const [isScheduling, setIsScheduling] = useState(false);

  const handleSchedulePreset = async (preset: StudyReminder) => {
    setIsScheduling(true);
    await scheduleStudyReminder(preset);
    setIsScheduling(false);
  };

  const handleScheduleCustom = async () => {
    const [hour, minute] = customTime.split(':').map(Number);
    const customReminder: StudyReminder = {
      id: Date.now(),
      title: '📚 Study Reminder',
      body: "It's time to continue your learning journey!",
      hour,
      minute,
    };
    setIsScheduling(true);
    await scheduleStudyReminder(customReminder);
    setIsScheduling(false);
  };

  const formatScheduledTime = (notification: any) => {
    if (notification.schedule?.at) {
      const date = new Date(notification.schedule.at);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return 'Unknown';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage your study reminders and achievement alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notification Permission */}
        {!isRegistered && isPushSupported && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <BellOff className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Push Notifications Disabled</p>
                <p className="text-sm text-muted-foreground">
                  Enable to receive remote notifications
                </p>
              </div>
            </div>
            <Button onClick={requestPushPermission}>Enable</Button>
          </div>
        )}

        {/* Local Notification Permission */}
        {isLocalSupported && !hasLocalPermission && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Study Reminders Disabled</p>
                <p className="text-sm text-muted-foreground">
                  Enable to schedule study reminders
                </p>
              </div>
            </div>
            <Button onClick={requestLocalPermission}>Enable</Button>
          </div>
        )}

        {!isPushSupported && !isLocalSupported && (
          <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground text-center">
              📱 Notifications are available on the mobile app
            </p>
          </div>
        )}

        {/* Scheduled Study Reminders Section */}
        {isLocalSupported && hasLocalPermission && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Study Reminders
              </h3>
              {scheduledReminders.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={cancelAllReminders}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Active Reminders */}
            {scheduledReminders.length > 0 ? (
              <div className="space-y-2">
                {scheduledReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bell className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{reminder.title}</p>
                        <p className="text-xs text-muted-foreground">{reminder.body}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{formatScheduledTime(reminder)}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => cancelReminder(reminder.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No study reminders scheduled
              </p>
            )}

            {/* Preset Reminders */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Quick Add</p>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_REMINDERS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => handleSchedulePreset(preset)}
                    disabled={isScheduling}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <p className="font-medium">{preset.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {preset.hour % 12 || 12}:{preset.minute.toString().padStart(2, '0')} {preset.hour >= 12 ? 'PM' : 'AM'}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Time */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="custom-time" className="text-sm whitespace-nowrap">
                Custom Time
              </Label>
              <Input
                id="custom-time"
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-32"
              />
              <Button 
                size="sm" 
                onClick={handleScheduleCustom}
                disabled={isScheduling}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Other Notification Settings */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium">Notification Preferences</h3>
          
          {/* Study Reminders Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <Label htmlFor="study-reminders" className="font-medium">
                  Study Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Daily reminders to keep your streak going
                </p>
              </div>
            </div>
            <Switch
              id="study-reminders"
              checked={settings.studyReminders}
              onCheckedChange={(checked) =>
                updateSettings({ studyReminders: checked })
              }
            />
          </div>

          {/* Achievement Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <Label htmlFor="achievement-alerts" className="font-medium">
                  Achievement Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you earn badges
                </p>
              </div>
            </div>
            <Switch
              id="achievement-alerts"
              checked={settings.achievementAlerts}
              onCheckedChange={(checked) =>
                updateSettings({ achievementAlerts: checked })
              }
            />
          </div>

          {/* Weekly Digest */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <Label htmlFor="weekly-digest" className="font-medium">
                  Weekly Digest
                </Label>
                <p className="text-sm text-muted-foreground">
                  Summary of your weekly progress
                </p>
              </div>
            </div>
            <Switch
              id="weekly-digest"
              checked={settings.weeklyDigest}
              onCheckedChange={(checked) =>
                updateSettings({ weeklyDigest: checked })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};