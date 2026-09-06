import { useState, useEffect, useCallback } from 'react';
import {
  BiometricAuth,
  BiometryType,
  CheckBiometryResult,
  AuthenticateOptions,
} from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import { useToast } from './use-toast';

export interface BiometricState {
  isSupported: boolean;
  isAvailable: boolean;
  biometryType: BiometryType;
  biometryTypes: BiometryType[];
  isEnabled: boolean;
  reason?: string;
}

const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';

export const useBiometricAuth = () => {
  const [state, setState] = useState<BiometricState>({
    isSupported: false,
    isAvailable: false,
    biometryType: BiometryType.none,
    biometryTypes: [],
    isEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkBiometry();
    loadEnabledState();
  }, []);

  const loadEnabledState = () => {
    const enabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
    setState((prev) => ({ ...prev, isEnabled: enabled }));
  };

  const checkBiometry = async () => {
    if (!Capacitor.isNativePlatform()) {
      setState((prev) => ({
        ...prev,
        isSupported: false,
        isAvailable: false,
        reason: 'Biometric auth is only available on native devices',
      }));
      setIsLoading(false);
      return;
    }

    try {
      const result: CheckBiometryResult = await BiometricAuth.checkBiometry();
      
      setState((prev) => ({
        ...prev,
        isSupported: true,
        isAvailable: result.isAvailable,
        biometryType: result.biometryType,
        biometryTypes: result.biometryTypes || [result.biometryType],
        reason: result.reason,
      }));
    } catch (error) {
      console.error('Error checking biometry:', error);
      setState((prev) => ({
        ...prev,
        isSupported: false,
        isAvailable: false,
        reason: 'Failed to check biometric availability',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const getBiometryName = useCallback((): string => {
    switch (state.biometryType) {
      case BiometryType.touchId:
        return 'Touch ID';
      case BiometryType.faceId:
        return 'Face ID';
      case BiometryType.fingerprintAuthentication:
        return 'Fingerprint';
      case BiometryType.faceAuthentication:
        return 'Face Recognition';
      case BiometryType.irisAuthentication:
        return 'Iris Scan';
      default:
        return 'Biometric';
    }
  }, [state.biometryType]);

  const authenticate = useCallback(async (
    reason?: string
  ): Promise<boolean> => {
    if (!state.isAvailable) {
      toast({
        title: 'Not Available',
        description: state.reason || 'Biometric authentication is not available',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const options: AuthenticateOptions = {
        reason: reason || `Authenticate with ${getBiometryName()} to access EduGenie`,
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'EduGenie Authentication',
        androidSubtitle: 'Verify your identity',
        androidConfirmationRequired: false,
      };

      await BiometricAuth.authenticate(options);
      
      toast({
        title: 'Authenticated',
        description: 'Welcome back!',
      });
      
      return true;
    } catch (error: any) {
      console.error('Biometric auth error:', error);
      
      // User cancelled
      if (error.code === 'userCancel' || error.message?.includes('cancel')) {
        return false;
      }

      toast({
        title: 'Authentication Failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
      
      return false;
    }
  }, [state.isAvailable, state.reason, getBiometryName, toast]);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!state.isAvailable) {
      toast({
        title: 'Not Available',
        description: 'Biometric authentication is not available on this device',
        variant: 'destructive',
      });
      return false;
    }

    // Verify with biometric before enabling
    const success = await authenticate('Verify to enable biometric login');
    
    if (success) {
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      setState((prev) => ({ ...prev, isEnabled: true }));
      
      toast({
        title: `${getBiometryName()} Enabled`,
        description: 'You can now use biometric authentication to login',
      });
    }
    
    return success;
  }, [state.isAvailable, authenticate, getBiometryName, toast]);

  const disableBiometric = useCallback(async (): Promise<boolean> => {
    // Verify with biometric before disabling
    const success = await authenticate('Verify to disable biometric login');
    
    if (success) {
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
      setState((prev) => ({ ...prev, isEnabled: false }));
      
      toast({
        title: `${getBiometryName()} Disabled`,
        description: 'Biometric authentication has been turned off',
      });
    }
    
    return success;
  }, [authenticate, getBiometryName, toast]);

  const toggleBiometric = useCallback(async (): Promise<boolean> => {
    if (state.isEnabled) {
      return disableBiometric();
    } else {
      return enableBiometric();
    }
  }, [state.isEnabled, enableBiometric, disableBiometric]);

  return {
    ...state,
    isLoading,
    getBiometryName,
    authenticate,
    enableBiometric,
    disableBiometric,
    toggleBiometric,
    checkBiometry,
  };
};
