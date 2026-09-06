import { useCallback } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

export interface SplashScreenConfig {
  showDuration?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  autoHide?: boolean;
}

export const useSplashScreen = () => {
  const isSupported = Capacitor.isNativePlatform();

  const show = useCallback(async (options?: {
    showDuration?: number;
    fadeInDuration?: number;
    fadeOutDuration?: number;
    autoHide?: boolean;
  }) => {
    if (!isSupported) return;

    try {
      await SplashScreen.show({
        showDuration: options?.showDuration ?? 2000,
        fadeInDuration: options?.fadeInDuration ?? 200,
        fadeOutDuration: options?.fadeOutDuration ?? 200,
        autoHide: options?.autoHide ?? true,
      });
    } catch (error) {
      console.error('Error showing splash screen:', error);
    }
  }, [isSupported]);

  const hide = useCallback(async (options?: {
    fadeOutDuration?: number;
  }) => {
    if (!isSupported) return;

    try {
      await SplashScreen.hide({
        fadeOutDuration: options?.fadeOutDuration ?? 200,
      });
    } catch (error) {
      console.error('Error hiding splash screen:', error);
    }
  }, [isSupported]);

  return {
    isSupported,
    show,
    hide,
  };
};
