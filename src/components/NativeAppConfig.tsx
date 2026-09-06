import { useEffect } from 'react';
import { useStatusBar } from '@/hooks/useStatusBar';
import { useSplashScreen } from '@/hooks/useSplashScreen';

interface NativeAppConfigProps {
  theme?: 'light' | 'dark';
}

/**
 * Component to configure native app features like status bar and splash screen.
 * Place this component at the root of your app (e.g., in App.tsx).
 */
export const NativeAppConfig = ({ theme = 'light' }: NativeAppConfigProps) => {
  const { configure: configureStatusBar, isSupported: statusBarSupported } = useStatusBar();
  const { hide: hideSplash, isSupported: splashSupported } = useSplashScreen();

  useEffect(() => {
    const initializeNativeFeatures = async () => {
      // Configure status bar based on theme
      if (statusBarSupported) {
        await configureStatusBar({
          style: theme === 'dark' ? 'light' : 'dark', // Light content on dark, dark content on light
          backgroundColor: theme === 'dark' ? '#1a1a2e' : '#ffffff',
          overlaysWebView: false,
        });
      }

      // Hide splash screen after app is ready
      if (splashSupported) {
        // Give the app a moment to render before hiding splash
        setTimeout(() => {
          hideSplash({ fadeOutDuration: 300 });
        }, 500);
      }
    };

    initializeNativeFeatures();
  }, [theme, configureStatusBar, hideSplash, statusBarSupported, splashSupported]);

  // This component doesn't render anything
  return null;
};
