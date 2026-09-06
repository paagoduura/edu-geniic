import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fingerprint, Scan, ShieldCheck, Loader2, KeyRound } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { BiometryType } from '@aparajita/capacitor-biometric-auth';

interface BiometricLockProps {
  onUnlock: () => void;
  onSkip?: () => void;
}

export const BiometricLock = ({ onUnlock, onSkip }: BiometricLockProps) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const {
    isAvailable,
    isEnabled,
    isLoading,
    biometryType,
    getBiometryName,
    authenticate,
  } = useBiometricAuth();

  // Auto-trigger biometric on mount if enabled
  useEffect(() => {
    if (!isLoading && isAvailable && isEnabled) {
      handleAuthenticate();
    }
  }, [isLoading, isAvailable, isEnabled]);

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    const success = await authenticate('Verify your identity to continue');
    setIsAuthenticating(false);
    
    if (success) {
      onUnlock();
    }
  };

  const getBiometryIcon = () => {
    switch (biometryType) {
      case BiometryType.touchId:
      case BiometryType.fingerprintAuthentication:
        return <Fingerprint className="h-16 w-16 text-primary" />;
      case BiometryType.faceId:
      case BiometryType.faceAuthentication:
        return <Scan className="h-16 w-16 text-primary" />;
      default:
        return <ShieldCheck className="h-16 w-16 text-primary" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If biometric is not enabled, skip the lock
  if (!isEnabled) {
    onUnlock();
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              {isAuthenticating ? (
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              ) : (
                getBiometryIcon()
              )}
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome Back!</CardTitle>
          <CardDescription>
            Use {getBiometryName()} to unlock EduGenie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleAuthenticate}
            disabled={isAuthenticating || !isAvailable}
            className="w-full"
            size="lg"
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                {biometryType === BiometryType.touchId || 
                 biometryType === BiometryType.fingerprintAuthentication ? (
                  <Fingerprint className="h-5 w-5 mr-2" />
                ) : (
                  <Scan className="h-5 w-5 mr-2" />
                )}
                Use {getBiometryName()}
              </>
            )}
          </Button>

          {onSkip && (
            <Button
              variant="ghost"
              onClick={onSkip}
              className="w-full"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Use Password Instead
            </Button>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            Your security is our priority. Biometric data never leaves your device.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
