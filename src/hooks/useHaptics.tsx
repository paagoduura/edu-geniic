import { useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export type HapticImpact = 'light' | 'medium' | 'heavy';
export type HapticNotification = 'success' | 'warning' | 'error';

export const useHaptics = () => {
  const isSupported = Capacitor.getPlatform() !== 'web';

  // Standard button tap feedback
  const impact = useCallback(async (style: HapticImpact = 'light') => {
    if (!isSupported) return;

    const impactStyles: Record<HapticImpact, ImpactStyle> = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };

    try {
      await Haptics.impact({ style: impactStyles[style] });
    } catch (error) {
      console.error('Haptic impact error:', error);
    }
  }, [isSupported]);

  // Notification feedback for completed actions
  const notification = useCallback(async (type: HapticNotification = 'success') => {
    if (!isSupported) return;

    const notificationTypes: Record<HapticNotification, NotificationType> = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };

    try {
      await Haptics.notification({ type: notificationTypes[type] });
    } catch (error) {
      console.error('Haptic notification error:', error);
    }
  }, [isSupported]);

  // Selection changed feedback
  const selectionChanged = useCallback(async () => {
    if (!isSupported) return;

    try {
      await Haptics.selectionChanged();
    } catch (error) {
      console.error('Haptic selection error:', error);
    }
  }, [isSupported]);

  // Vibrate for a duration (Android only)
  const vibrate = useCallback(async (duration: number = 300) => {
    if (!isSupported) return;

    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.error('Haptic vibrate error:', error);
    }
  }, [isSupported]);

  // Quick tap feedback - most common use case
  const tap = useCallback(() => impact('light'), [impact]);

  // Button press feedback
  const buttonPress = useCallback(() => impact('medium'), [impact]);

  // Heavy action feedback (e.g., delete, important action)
  const heavyAction = useCallback(() => impact('heavy'), [impact]);

  // Success feedback (e.g., task completed, quiz passed)
  const success = useCallback(() => notification('success'), [notification]);

  // Warning feedback (e.g., validation error)
  const warning = useCallback(() => notification('warning'), [notification]);

  // Error feedback (e.g., action failed)
  const error = useCallback(() => notification('error'), [notification]);

  return {
    isSupported,
    // Low-level methods
    impact,
    notification,
    selectionChanged,
    vibrate,
    // Convenience methods
    tap,
    buttonPress,
    heavyAction,
    success,
    warning,
    error,
  };
};

// Singleton instance for use outside React components
let hapticsInstance: ReturnType<typeof useHaptics> | null = null;

export const getHaptics = () => {
  if (!hapticsInstance) {
    const isSupported = Capacitor.getPlatform() !== 'web';
    
    hapticsInstance = {
      isSupported,
      impact: async (style: HapticImpact = 'light') => {
        if (!isSupported) return;
        const impactStyles: Record<HapticImpact, ImpactStyle> = {
          light: ImpactStyle.Light,
          medium: ImpactStyle.Medium,
          heavy: ImpactStyle.Heavy,
        };
        await Haptics.impact({ style: impactStyles[style] });
      },
      notification: async (type: HapticNotification = 'success') => {
        if (!isSupported) return;
        const notificationTypes: Record<HapticNotification, NotificationType> = {
          success: NotificationType.Success,
          warning: NotificationType.Warning,
          error: NotificationType.Error,
        };
        await Haptics.notification({ type: notificationTypes[type] });
      },
      selectionChanged: async () => {
        if (!isSupported) return;
        await Haptics.selectionChanged();
      },
      vibrate: async (duration: number = 300) => {
        if (!isSupported) return;
        await Haptics.vibrate({ duration });
      },
      tap: async () => {
        if (!isSupported) return;
        await Haptics.impact({ style: ImpactStyle.Light });
      },
      buttonPress: async () => {
        if (!isSupported) return;
        await Haptics.impact({ style: ImpactStyle.Medium });
      },
      heavyAction: async () => {
        if (!isSupported) return;
        await Haptics.impact({ style: ImpactStyle.Heavy });
      },
      success: async () => {
        if (!isSupported) return;
        await Haptics.notification({ type: NotificationType.Success });
      },
      warning: async () => {
        if (!isSupported) return;
        await Haptics.notification({ type: NotificationType.Warning });
      },
      error: async () => {
        if (!isSupported) return;
        await Haptics.notification({ type: NotificationType.Error });
      },
    };
  }
  return hapticsInstance;
};
