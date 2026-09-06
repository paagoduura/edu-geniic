import { useEffect, useCallback } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export interface StatusBarConfig {
  style?: 'dark' | 'light' | 'default';
  backgroundColor?: string;
  overlaysWebView?: boolean;
}

export const useStatusBar = () => {
  const isSupported = Capacitor.isNativePlatform();

  const setStyle = useCallback(async (style: 'dark' | 'light' | 'default') => {
    if (!isSupported) return;

    try {
      const styleMap = {
        dark: Style.Dark,
        light: Style.Light,
        default: Style.Default,
      };
      await StatusBar.setStyle({ style: styleMap[style] });
    } catch (error) {
      console.error('Error setting status bar style:', error);
    }
  }, [isSupported]);

  const setBackgroundColor = useCallback(async (color: string) => {
    if (!isSupported) return;

    try {
      await StatusBar.setBackgroundColor({ color });
    } catch (error) {
      console.error('Error setting status bar background:', error);
    }
  }, [isSupported]);

  const setOverlaysWebView = useCallback(async (overlay: boolean) => {
    if (!isSupported) return;

    try {
      await StatusBar.setOverlaysWebView({ overlay });
    } catch (error) {
      console.error('Error setting status bar overlay:', error);
    }
  }, [isSupported]);

  const hide = useCallback(async () => {
    if (!isSupported) return;

    try {
      await StatusBar.hide();
    } catch (error) {
      console.error('Error hiding status bar:', error);
    }
  }, [isSupported]);

  const show = useCallback(async () => {
    if (!isSupported) return;

    try {
      await StatusBar.show();
    } catch (error) {
      console.error('Error showing status bar:', error);
    }
  }, [isSupported]);

  const configure = useCallback(async (config: StatusBarConfig) => {
    if (!isSupported) return;

    try {
      if (config.style) {
        await setStyle(config.style);
      }
      if (config.backgroundColor) {
        await setBackgroundColor(config.backgroundColor);
      }
      if (config.overlaysWebView !== undefined) {
        await setOverlaysWebView(config.overlaysWebView);
      }
    } catch (error) {
      console.error('Error configuring status bar:', error);
    }
  }, [isSupported, setStyle, setBackgroundColor, setOverlaysWebView]);

  return {
    isSupported,
    setStyle,
    setBackgroundColor,
    setOverlaysWebView,
    hide,
    show,
    configure,
  };
};
